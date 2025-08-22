import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { supabase } from './supabaseClient';

// Polyfill para 'process' si no está definido
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {} };
}

// --- FUNCIÓN AUXILIAR PARA IDs ÚNICOS ---
const generateUniqueId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// --- FUNCIÓN "TRADUCTORA" DE NÚMEROS (VERSIÓN FINAL, AHORA SÍ) ---
const parseChileanNumber = (str) => {
  if (typeof str !== 'string' || !str) {
    return Number(str) || 0;
  }

  const cleanStr = str.trim();

  const lastDot = cleanStr.lastIndexOf('.');
  const lastComma = cleanStr.lastIndexOf(',');

  // CASO 1: Formato internacional detectado (el punto es el último separador).
  // Ejemplos: "1,234.56" o "1234.56"
  if (lastDot > lastComma) {
    // Se eliminan las comas de miles y se parsea.
    const parsableString = cleanStr.replace(/,/g, '');
    const num = parseFloat(parsableString);
    return isNaN(num) ? 0 : num;
  }

  // CASO 2: Formato chileno con decimales detectado.
  // La coma es el último separador Y la parte decimal NO tiene 3 dígitos.
  // Ejemplos: "1.234,56" o "123,45"
  if (lastComma > lastDot) {
    const partAfterComma = cleanStr.substring(lastComma + 1);
    if (partAfterComma.length !== 3) {
      // Se eliminan los puntos de miles y se cambia la coma por un punto.
      const parsableString = cleanStr.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(parsableString);
      return isNaN(num) ? 0 : num;
    }
  }

  // CASO 3 (POR DEFECTO): El número es un entero con separadores de miles.
  // Cubre "12,450", "12.450", "1.234", y "1234".
  // La forma más segura es eliminar todo lo que no sea un dígito.
  const parsableString = cleanStr.replace(/\D/g, '');
  if (parsableString === '') {
    return 0;
  }
  const num = parseFloat(parsableString);
  return isNaN(num) ? 0 : num;
};

// --- CONSTANTES ---
const TIP_PERCENTAGE = 0.10; // Propina del 10%
const MAX_COMENSALES = 20;
const ITEM_TYPES = {
    FULL: 'full',
    SHARED: 'shared'
};

// --- COMPONENTES DE LA INTERFAZ ---

// --- NUEVO COMPONENTE: Pantalla de carga para sesiones compartidas ---
const LoadingSessionStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-blue-700 text-lg font-semibold">Cargando sesión compartida...</p>
    </div>
);

const LoadingModal = ({ isOpen, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-[100] print:hidden">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
      <p className="text-white text-lg font-semibold">{message}</p>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, confirmText, cancelText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end justify-center z-50 print:hidden">
      <div className="bg-white p-6 rounded-t-2xl shadow-2xl w-full max-w-md mx-auto animate-slide-up">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Confirmar Acción</h2>
        <p className="text-gray-700 mb-6 text-center">{message}</p>
        <div className="flex flex-col sm:flex-row-reverse gap-3">
          <button
            onClick={onConfirm}
            className="w-full px-5 py-3 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {confirmText || 'Confirmar'}
          </button>
          <button
            onClick={onClose}
            className="w-full px-5 py-3 bg-gray-200 text-gray-800 rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {cancelText || 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ShareItemModal = ({ isOpen, onClose, availableProducts, comensales, onShareConfirm }) => {
  const [selectedProductToShare, setSelectedProductToShare] = useState('');
  const [selectedComensalesForShare, setSelectedComensalesForShare] = useState([]);
  const [isShareWarningModalOpen, setIsShareWarningModalOpen] = useState(false);
  const [tempShareProductId, setTempShareProductId] = useState(null);
  const [tempSharingComensalIds, setTempSharingComensalIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedProductToShare('');
      setSelectedComensalesForShare([]);
    }
  }, [isOpen]);

  const handleComensalToggle = (comensalId) => {
    setSelectedComensalesForShare(prev =>
      prev.includes(comensalId)
        ? prev.filter(id => id !== comensalId)
        : [...prev, comensalId]
    );
  };

  const handleConfirm = () => {
    if (!selectedProductToShare || selectedComensalesForShare.length === 0) {
      alert('Por favor, selecciona un producto y al menos un comensal para compartir.');
      return;
    }
    if (selectedComensalesForShare.length === 1) {
        setTempShareProductId(selectedProductToShare);
        setTempSharingComensalIds(selectedComensalesForShare);
        setIsShareWarningModalOpen(true);
    } else {
        onShareConfirm(selectedProductToShare, selectedComensalesForShare);
        onClose();
    }
  };

  const confirmShareWarning = () => {
    onShareConfirm(tempShareProductId, tempSharingComensalIds);
    setIsShareWarningModalOpen(false);
    onClose();
  };

  const sharableProducts = availableProducts instanceof Map
    ? Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0)
    : [];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-end justify-center z-50 print:hidden">
        <div className="bg-white p-6 rounded-t-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[80vh] flex flex-col animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Compartir Ítem</h2>
          <div className="flex-grow overflow-y-auto space-y-6 pr-2">
            <div>
              <label htmlFor="share-product-select" className="block text-sm font-medium text-gray-700 mb-2">
                1. Selecciona Ítem a Compartir:
              </label>
              <select
                id="share-product-select"
                value={selectedProductToShare}
                onChange={(e) => setSelectedProductToShare(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
              >
                <option value="" disabled>Selecciona un producto</option>
                {sharableProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (${Number(product.price).toLocaleString('es-CL')}) (Disp: {Number(product.quantity)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Selecciona Comensales:
              </label>
              <div className="grid grid-cols-2 gap-3 border p-3 rounded-md bg-gray-50">
                {comensales.map(comensal => (
                  <div key={comensal.id}
                       className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedComensalesForShare.includes(comensal.id) ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'}`}
                       onClick={() => handleComensalToggle(comensal.id)}>
                    <input
                      type="checkbox"
                      id={`comensal-share-${comensal.id}`}
                      checked={selectedComensalesForShare.includes(comensal.id)}
                      onChange={() => {}}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                    />
                    <label htmlFor={`comensal-share-${comensal.id}`} className="ml-3 text-sm font-medium text-gray-900 pointer-events-none">
                      {comensal.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
            <button
              onClick={handleConfirm}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Confirmar Compartir
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isShareWarningModalOpen}
        onClose={() => setIsShareWarningModalOpen(false)}
        onConfirm={confirmShareWarning}
        message="Estás compartiendo un ítem con un solo comensal. ¿No sería mejor agregarlo directamente? Continuar para dividirlo."
        confirmText="Dividir de todos modos"
        cancelText="Cancelar"
      />
    </>
  );
};

const SummaryModal = ({ isOpen, onClose, summaryData, onPrint }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Resumen de la Cuenta</h2>
        <div className="space-y-6 overflow-y-auto flex-grow">
          {summaryData.map(diner => (
            <div key={diner.id} className="border-b border-dashed border-gray-300 pb-4 last:border-b-0">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">{diner.name}</h3>
              <div className="flex justify-between text-gray-600">
                <span>Consumo (sin propina):</span>
                <span>${diner.totalSinPropina.toLocaleString('es-CL')}</span>
              </div>
              {diner.descuentoAplicado > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento:</span>
                  <span>-${diner.descuentoAplicado.toLocaleString('es-CL')}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Propina (10%):</span>
                <span>${diner.propina.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-200">
                <span>TOTAL A PAGAR:</span>
                <span>${diner.totalConPropina.toLocaleString('es-CL')}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row-reverse gap-4 mt-8">
            <button
              onClick={onPrint}
              className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Generar PDF
            </button>
            <button
              onClick={onClose}
              className="w-full px-5 py-3 bg-gray-200 text-gray-800 rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};


// --- LÓGICA DE ESTADO CENTRALIZADA (REDUCER) ---

// --- FUNCIÓN MODIFICADA: Determina el paso inicial antes de renderizar ---
const getInitialStep = () => {
    // Si hay una 'id' en la URL, empezamos en una pantalla de carga especial.
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('id')) {
            return 'loading_session';
        }
    }
    // Si no, empezamos en la pantalla de bienvenida.
    return 'landing';
};

const initialState = {
    currentStep: getInitialStep(),
    userId: null,
    shareId: null,
    shareLink: '',
    masterProductList: new Map(),
    availableProducts: new Map(),
    comensales: [],
    activeSharedInstances: new Map(),
    discountPercentage: 0,
    discountCap: 0,
    lastUpdated: null
};

// Reemplaza tu función billReducer completa con esta versión
function billReducer(state, action) {
    const recalculateAvailableProducts = (masterList, comensales) => {
        if (!masterList || masterList.size === 0) return new Map();
        
        // Hacemos una copia profunda para no mutar el estado maestro.
        const newAvailableProducts = new Map(JSON.parse(JSON.stringify(Array.from(masterList))));
        
        // Usamos un Set para registrar los grupos de ítems compartidos que ya hemos contado.
        const processedShareInstances = new Set();
    
        comensales.forEach(diner => {
            (diner.selectedItems || []).forEach(item => {
                const productInMap = newAvailableProducts.get(item.id);
                if (productInMap) {
                    if (item.type === ITEM_TYPES.SHARED) {
                        // Si es un ítem compartido, solo lo descontamos una vez por grupo.
                        if (!processedShareInstances.has(item.shareInstanceId)) {
                            productInMap.quantity -= 1; // Se descuenta solo 1 unidad.
                            processedShareInstances.add(item.shareInstanceId); // Lo marcamos como procesado.
                        }
                    } else {
                        // Si es un ítem completo, descontamos su cantidad.
                        productInMap.quantity -= item.quantity;
                    }
                }
            });
        });
    
        return newAvailableProducts;
    };

    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'SET_USER_ID':
            return { ...state, userId: action.payload };
        case 'SET_SHARE_ID':
            return { ...state, shareId: action.payload };
        case 'SET_SHARE_LINK':
            return { ...state, shareLink: action.payload };
        case 'APPLY_DISCOUNT': {
            const { percentage, cap } = action.payload;
            return {
                ...state,
                discountPercentage: parseFloat(percentage) || 0,
                discountCap: parseFloat(cap) || 0,
                lastUpdated: new Date().toISOString() // <-- LA LÍNEA CRÍTICA QUE FALTABA
            };
        }
        case 'ADD_COMENSAL': {
            if (state.comensales.length >= MAX_COMENSALES) return state;
            const newComensalId = generateUniqueId('diner');
            const newComensal = { id: newComensalId, name: action.payload.trim(), selectedItems: [], total: 0 };
            return { ...state, comensales: [...state.comensales, newComensal], lastUpdated: new Date().toISOString() };
        }
        case 'REMOVE_COMENSAL': {
            const comensalIdToRemove = action.payload;
            // 1. Filtramos para quitar al comensal
            const newComensales = state.comensales.filter(c => c.id !== comensalIdToRemove);
            
            // 2. Recalculamos los productos. Al ya no estar el comensal, sus ítems se "devuelven" al pool.
            const newAvailableProducts = recalculateAvailableProducts(state.masterProductList, newComensales);
        
            return { 
                ...state, 
                comensales: newComensales, 
                availableProducts: newAvailableProducts, // <-- Añadimos esto
                lastUpdated: new Date().toISOString() 
            };
        }
        case 'LOAD_STATE': {
            const serverData = action.payload;

            // CAMBIO CLAVE: Ya no hacemos un fallback a availableProducts.
            // masterProductList es la única fuente de verdad para el inventario total.
            // Si no existe, empezamos con un mapa vacío.
            const finalMasterList = new Map(Object.entries(serverData.masterProductList || {}));
            
            return {
                ...state,
                comensales: (serverData.comensales || []).map(diner => ({
                    ...diner,
                    selectedItems: diner.selectedItems || []
                })),
                activeSharedInstances: new Map(Object.entries(serverData.activeSharedInstances || {}).map(([key, value]) => [key, Array.from(value)])), // Corregido para que el valor sea un array, no un Set
                shareId: serverData.shareId || state.shareId,
                lastUpdated: serverData.lastUpdated || null,
                masterProductList: finalMasterList,
                // La recalculación ahora siempre funcionará porque parte del inventario correcto.
                availableProducts: recalculateAvailableProducts(finalMasterList, serverData.comensales || []),
                discountPercentage: serverData.discountPercentage || 0,
                discountCap: serverData.discountCap || 0
            };
        }
        case 'UPDATE_AVAILABLE_PRODUCTS':
            return {
                ...state,
                availableProducts: action.payload,
                lastUpdated: new Date().toISOString()
            };
        case 'SET_PRODUCTS_FOR_REVIEW':
            return {
                ...state,
                availableProducts: action.payload,
                masterProductList: new Map(action.payload),
                discountPercentage: 0,
                discountCap: 0,
                currentStep: 'reviewing',
                lastUpdated: new Date().toISOString()
            };
        case 'SET_PRODUCTS_AND_ADVANCE':
            return {
                ...state,
                masterProductList: new Map(action.payload),
                availableProducts: new Map(action.payload),
                currentStep: 'assigning',
                lastUpdated: new Date().toISOString()
            };
        case 'SYNC_STATE': {
            const serverStateData = action.payload;
            // CAMBIO SUTIL PERO IMPORTANTE:
            // Nos aseguramos de que el masterProductList del estado local no se pierda durante la sincronización.
            // La sincronización se enfoca en comensales y descuentos, no en el inventario total.
            const masterListToUse = state.masterProductList.size > 0 ? state.masterProductList : new Map(Object.entries(serverStateData.masterProductList || {}));
            
            // ... (el resto de la lógica de SYNC_STATE para reconciliar comensales sigue igual) ...
            const localState = state;
            const serverComensalesMap = new Map((serverStateData.comensales || []).map(c => [c.id, c]));
            const localComensalesMap = new Map(localState.comensales.map(c => [c.id, c]));
            const reconciledComensales = [];
            const allDinerIds = new Set([...serverComensalesMap.keys(), ...localComensalesMap.keys()]);

            allDinerIds.forEach(id => {
                const serverDiner = serverComensalesMap.get(id);
                const localDiner = localComensalesMap.get(id);

                if (serverDiner && !localDiner) {
                    reconciledComensales.push(serverDiner);
                } else if (!serverDiner && localDiner) {
                    reconciledComensales.push(localDiner);
                } else if (serverDiner && localDiner) {
                    const finalItems = [];
                    const localItemsMap = new Map((localDiner.selectedItems || []).map(item => [item.type === ITEM_TYPES.SHARED ? item.shareInstanceId : item.id, item]));
                    const serverItemsMap = new Map((serverDiner.selectedItems || []).map(item => [item.type === ITEM_TYPES.SHARED ? item.shareInstanceId : item.id, item]));
                    const allItemKeys = new Set([...localItemsMap.keys(), ...serverItemsMap.keys()]);

                    allItemKeys.forEach(key => {
                        const localItem = localItemsMap.get(key);
                        const serverItem = serverItemsMap.get(key);
                        if (localItem && !serverItem) {
                            finalItems.push(localItem);
                        } else if (serverItem && !localItem) {
                            finalItems.push(serverItem);
                        } else if (serverItem && localItem) {
                            const localDate = new Date(localItem.modifiedAt || 0);
                            const serverDate = new Date(serverItem.modifiedAt || 0);
                            finalItems.push(serverDate > localDate ? serverItem : localItem);
                        }
                    });
                    reconciledComensales.push({ ...serverDiner, selectedItems: finalItems });
                }
            });

            return {
                ...state,
                masterProductList: masterListToUse, // Aseguramos que no se borre
                comensales: reconciledComensales,
                activeSharedInstances: new Map(Object.entries(serverStateData.activeSharedInstances || {}).map(([key, value]) => [key, Array.from(value)])),
                lastUpdated: serverStateData.lastUpdated,
                availableProducts: recalculateAvailableProducts(masterListToUse, reconciledComensales),
                discountPercentage: serverStateData.discountPercentage !== undefined ? serverStateData.discountPercentage : state.discountPercentage,
                discountCap: serverStateData.discountCap !== undefined ? serverStateData.discountCap : state.discountCap
            };
        }
        case 'ADD_ITEM': {
            const { comensalId, productId } = action.payload;
            const productInStock = state.availableProducts.get(productId);
            if (!productInStock || Number(productInStock.quantity) <= 0) return state;

            const newComensales = state.comensales.map(comensal => {
                if (comensal.id === comensalId) {
                    const updatedComensal = { ...comensal, selectedItems: JSON.parse(JSON.stringify(comensal.selectedItems)) };
                    const existingItemIndex = updatedComensal.selectedItems.findIndex(item => item.id === productId && item.type === ITEM_TYPES.FULL);
                    if (existingItemIndex !== -1) {
                        updatedComensal.selectedItems[existingItemIndex].quantity += 1;
                        updatedComensal.selectedItems[existingItemIndex].modifiedAt = new Date().toISOString();
                    } else {
                        updatedComensal.selectedItems.push({
                            id: productInStock.id, name: productInStock.name,
                            originalBasePrice: Number(productInStock.price), quantity: 1, type: ITEM_TYPES.FULL,
                            modifiedAt: new Date().toISOString(),
                        });
                    }
                    return updatedComensal;
                }
                return comensal;
            });
            return {
                ...state,
                comensales: newComensales,
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales),
                lastUpdated: new Date().toISOString()
            };
        }
        case 'SHARE_ITEM': {
            const { productId, sharingComensalIds } = action.payload;
            const productToShare = state.availableProducts.get(productId);
            if (!productToShare || !sharingComensalIds || sharingComensalIds.length === 0 || state.availableProducts.get(productId).quantity < 1) return state;

            const shareInstanceId = generateUniqueId('share');
            const newActiveSharedInstances = new Map(state.activeSharedInstances).set(shareInstanceId, new Set(sharingComensalIds));
            const basePricePerShare = Number(productToShare.price) / Number(sharingComensalIds.length);

            const newComensales = state.comensales.map(comensal => {
                if (sharingComensalIds.includes(comensal.id)) {
                    const newItemData = {
                        id: productToShare.id,
                        name: productToShare.name,
                        originalBasePrice: basePricePerShare,
                        quantity: 1,
                        type: ITEM_TYPES.SHARED,
                        sharedByCount: Number(sharingComensalIds.length),
                        shareInstanceId: shareInstanceId,
                        modifiedAt: new Date().toISOString(),
                    };
                    return { ...comensal, selectedItems: [...comensal.selectedItems, newItemData] };
                }
                return comensal;
            });

            return {
                ...state,
                comensales: newComensales,
                activeSharedInstances: newActiveSharedInstances,
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales),
                lastUpdated: new Date().toISOString()
            };
        }
        case 'REMOVE_ITEM_FROM_COMENSAL': {
            const { comensalId, itemIdentifier, saveToServer } = action.payload;
            const comensalTarget = state.comensales.find(c => c.id === comensalId);
            if (!comensalTarget) return state;

            const itemIndex = comensalTarget.selectedItems.findIndex(item => 
                (item.type === ITEM_TYPES.SHARED && String(item.shareInstanceId) === String(itemIdentifier)) || 
                (item.type === ITEM_TYPES.FULL && item.id === itemIdentifier)
            );
            if (itemIndex === -1) return state;

            const itemToRemove = { ...comensalTarget.selectedItems[itemIndex] };
            let newComensales = [...state.comensales];
            let newSharedInstances = new Map(state.activeSharedInstances);

            if (itemToRemove.type === ITEM_TYPES.FULL) {
                newComensales = state.comensales.map(c => {
                    if (c.id === comensalId) {
                        const updatedItems = [...c.selectedItems];
                        updatedItems.splice(itemIndex, 1);
                        return { ...c, selectedItems: updatedItems };
                    }
                    return c;
                });
            } else {
                const { shareInstanceId } = itemToRemove;
                const shareGroup = newSharedInstances.get(shareInstanceId);
                if (!shareGroup) return state;

                shareGroup.delete(comensalId);

                if (shareGroup.size > 0) {
                    const fullProduct = state.masterProductList.get(itemToRemove.id);
                    if (!fullProduct) return state;
                    const newPricePerShare = Number(fullProduct.price) / shareGroup.size;

                    newComensales = state.comensales.map(diner => {
                        if (diner.id === comensalId) {
                            return {
                                ...diner,
                                selectedItems: diner.selectedItems.filter(i => String(i.shareInstanceId) !== String(shareInstanceId))
                            };
                        } else if (shareGroup.has(diner.id)) {
                            return {
                                ...diner,
                                selectedItems: diner.selectedItems.map(item =>
                                    String(item.shareInstanceId) === String(shareInstanceId)
                                        ? {
                                            ...item,
                                            originalBasePrice: newPricePerShare,
                                            sharedByCount: shareGroup.size,
                                            modifiedAt: new Date().toISOString()
                                        }
                                        : item
                                )
                            };
                        }
                        return diner;
                    });
                } else {
                    newSharedInstances.delete(shareInstanceId);
                    newComensales = state.comensales.map(diner => {
                        if (diner.id === comensalId) {
                            return {
                                ...diner,
                                selectedItems: diner.selectedItems.filter(i => String(i.shareInstanceId) !== String(shareInstanceId))
                            };
                        }
                        return diner;
                    });
                }
            }

            const newAvailableProducts = recalculateAvailableProducts(state.masterProductList, newComensales);

            const newState = {
                ...state,
                comensales: newComensales,
                activeSharedInstances: newSharedInstances,
                availableProducts: newAvailableProducts,
                lastUpdated: new Date().toISOString()
            };

            // Forzar guardado inmediato al servidor
            if (saveToServer) {
                saveToServer(newState);
            }

            return newState;
        }
        case 'CLEAR_COMENSAL_ITEMS': {
            const { comensalId } = action.payload;
            const newComensales = state.comensales.map(c => c.id === comensalId ? { ...c, selectedItems: [] } : c);
            return {
                ...state,
                comensales: newComensales,
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales),
                lastUpdated: new Date().toISOString()
            };
        }
        case 'RESET_SESSION': {
            const url = new URL(window.location.href);
            url.searchParams.delete('id');
            window.history.replaceState({}, document.title, url.toString());
            return {
                ...initialState,
                currentStep: 'landing',
                userId: state.userId,
                shareId: `local-session-${Date.now()}`,
                lastUpdated: new Date().toISOString()
            };
        }
        default:
            return state;
    }
}

// --- Componente principal de la aplicación ---
const App = () => {
    const [state, dispatch] = useReducer(billReducer, initialState);
    const { currentStep, userId, shareId, shareLink, availableProducts, comensales, activeSharedInstances, discountPercentage, discountCap, masterProductList } = state;

    // ... (El resto de los useState y useRef no cambian) ...
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [newComensalName, setNewComensalName] = useState('');
    const [addComensalMessage, setAddComensalMessage] = useState({ type: '', text: '' });
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isClearComensalModalOpen, setIsClearComensalModalOpen] = useState(false);
    const [comensalToClearId, setComensalToClearId] = useState(null);
    const [isRemoveComensalModalOpen, setIsRemoveComensalModalOpen] = useState(false);
    const [comensalToRemoveId, setComensalToRemoveId] = useState(null);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [summaryData, setSummaryData] = useState([]);
    const [isImageProcessing, setIsImageProcessing] = useState(false);
    const [imageProcessingError, setImageProcessingError] = useState(null);
    const hasPendingChanges = useRef(false);
    const initialLoadDone = useRef(false);
    const isLoadingFromServer = useRef(false);
    const justCreatedSessionId = useRef(null);
    const lastSyncedTimestamp = useRef(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const isCriticalOperation = useRef(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
    const isSaving = useRef(false);
    const lastFailedSaveData = useRef(null);
    
    const handleResetAll = useCallback(() => { dispatch({ type: 'RESET_SESSION' }); }, []);

    // Maneja cambios en los campos de un producto existente (nombre, precio, cantidad)
    const handleProductChange = (productId, field, value) => {
        hasPendingChanges.current = true;
        // --- CAMBIO AQUÍ ---
        const newProducts = new Map(state.masterProductList); 
        const product = newProducts.get(productId);
        if (product) {
            newProducts.set(productId, { ...product, [field]: value });
            // Esta acción ahora actualizará correctamente el masterProductList
            dispatch({ type: 'SET_PRODUCTS_FOR_REVIEW', payload: newProducts });
        }
    };
    
const handleRetrySave = () => {
    if (isSaving.current) return; // Protección extra
    if (!lastFailedSaveData.current) {
        console.error("No hay datos de guardado fallido para reintentar.");
        // Si no hay datos, forzamos un guardado del estado actual activando el useEffect
        dispatch({ type: 'UPDATE_AVAILABLE_PRODUCTS', payload: availableProducts });
        return;
    }

    const dataToRetry = lastFailedSaveData.current;

    isSaving.current = true;
    setSaveStatus('saving');

    saveStateToSupabase(shareId, dataToRetry)
        .then(() => {
            setSaveStatus('saved');
            lastFailedSaveData.current = null;
            hasPendingChanges.current = false;
        })
        .catch((e) => {
            console.error("El reintento de guardado falló:", e.message);
            setSaveStatus('error');
            // Mantenemos los datos en lastFailedSaveData para poder reintentar de nuevo
        })
        .finally(() => {
            isSaving.current = false;
        });
};


    // Maneja la adición de un nuevo producto desde el formulario de ReviewStep
    const handleAddNewProduct = (newItem) => {
        hasPendingChanges.current = true;
        // --- CAMBIO AQUÍ ---
        const newProducts = new Map(state.masterProductList);
        const newId = generateUniqueId('item');
        newProducts.set(newId, { ...newItem, id: newId });
        dispatch({ type: 'SET_PRODUCTS_FOR_REVIEW', payload: newProducts });
    };

    // Maneja la eliminación de un producto
    const handleRemoveProduct = (productId) => {
        hasPendingChanges.current = true;
        // --- CAMBIO AQUÍ ---
        const newProducts = new Map(state.masterProductList);
        newProducts.delete(productId);
        dispatch({ type: 'SET_PRODUCTS_FOR_REVIEW', payload: newProducts });
    };

    // ... (El resto de las funciones de App.js no cambian, excepto las marcadas) ...
    // BORRA la función loadStateFromGoogleSheets y reemplázala con esta:
const loadStateFromSupabase = useCallback(async (idToLoad) => {
    if (!idToLoad || idToLoad.startsWith('local-')) return;

    try {
        isLoadingFromServer.current = true;
        const { data, error } = await supabase
            .from('sessions')
            .select('data')
            .eq('id', idToLoad)
            .single(); // .single() es clave para obtener un solo objeto

        if (error) {
            // Si no se encuentra la fila, Supabase devuelve un error
            console.warn("Error de Supabase (probablemente no se encontró la sesión):", error.message);
            alert("La sesión compartida no fue encontrada. Se ha iniciado una nueva sesión local.");
            dispatch({ type: 'RESET_SESSION' });
            return;
        }

        if (data) {
            // La data del estado está dentro del campo 'data'
            const sessionData = data.data;
            const loadedProducts = new Map(Object.entries(sessionData.availableProducts || {}));
            const loadedSharedInstances = new Map(Object.entries(sessionData.activeSharedInstances || {}).map(([key, value]) => [Number(key), new Set(value)]));

            dispatch({ type: 'LOAD_STATE', payload: { ...sessionData, availableProducts: loadedProducts, activeSharedInstances: loadedSharedInstances } });
            lastSyncedTimestamp.current = sessionData.lastUpdated;
            setSaveStatus('saved');

            if (loadedProducts.size > 0 || (sessionData.comensales && sessionData.comensales.length > 0)) {
                dispatch({ type: 'SET_STEP', payload: 'assigning' });
            } else {
                dispatch({ type: 'SET_STEP', payload: 'reviewing' });
            }
        }
    } catch (error) {
        console.error("Error crítico al cargar desde Supabase:", error);
    } finally {
        setTimeout(() => {
            isLoadingFromServer.current = false;
            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
            }
        }, 0);
    }
}, [dispatch]);
  
    const saveStateToSupabase = useCallback(async (currentShareId, dataToSave) => {
    if (!currentShareId || currentShareId.startsWith('local-')) return;

    try {
        const { error } = await supabase
            .from('sessions')
            .upsert({ id: currentShareId, data: dataToSave });

        if (error) throw error;

        lastSyncedTimestamp.current = dataToSave.lastUpdated;
    } catch (error) {
        console.error("Error al guardar en Supabase:", error);
        throw error; // Propaga el error para que la lógica de reintento funcione
    }
}, []);


    const handleStartNewSession = async () => {
        setLoadingMessage("Creando sesión...");
        setIsGeneratingLink(true);
    
        await handleResetAll();
    
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const initialData = {
            comensales: [],
            availableProducts: {},
            masterProductList: {},
            activeSharedInstances: {},
            lastUpdated: new Date().toISOString()
        };
    
        try {
            await saveStateToSupabase(newSessionId, initialData, true);
            dispatch({ type: 'SET_SHARE_ID', payload: newSessionId });
    
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('id', newSessionId);
            window.history.replaceState({ path: newUrl.toString() }, '', newUrl.toString());
    
            dispatch({ type: 'SET_STEP', payload: 'loading' });
        } catch (error) {
            console.error("Error creating new session:", error);
            alert("No se pudo crear la sesión remota. La aplicación funcionará en modo local.");
            dispatch({ type: 'SET_SHARE_ID', payload: `local-session-${Date.now()}` });
            dispatch({ type: 'SET_STEP', payload: 'loading' });
        } finally {
            setIsGeneratingLink(false);
        }
    };
    
    useEffect(() => {
        const uniqueSessionUserId = localStorage.getItem('billSplitterUserId');
        if (uniqueSessionUserId) {
            dispatch({ type: 'SET_USER_ID', payload: uniqueSessionUserId });
        } else {
            const newUniqueId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('billSplitterUserId', newUniqueId);
            dispatch({ type: 'SET_USER_ID', payload: newUniqueId });
        }
        setAuthReady(true);
    }, []);

    useEffect(() => {
        const performInitialLoad = async () => {
            if (!authReady || !userId || initialLoadDone.current) return;
            const urlParams = new URLSearchParams(window.location.search);
            const idFromUrl = urlParams.get('id');
            if (idFromUrl) {
                await loadStateFromSupabase(idFromUrl);
            } else {
                dispatch({ type: 'SET_STEP', payload: 'landing' });
            }
            initialLoadDone.current = true;
        };
        performInitialLoad();
    }, [authReady, userId, loadStateFromSupabase]);
  
    useEffect(() => {
    // Solo nos suscribimos si tenemos un ID de sesión válido y no es local
    if (!shareId || shareId.startsWith('local-')) return;

    // Creamos un canal de suscripción. Es buena práctica darle un nombre único.
    const channel = supabase
        .channel(`session-updates-${shareId}`)
        .on(
            'postgres_changes',
            {
                event: '*', // Escucha inserciones, actualizaciones y eliminaciones
                schema: 'public',
                table: 'sessions',
                filter: `id=eq.${shareId}` // MUY IMPORTANTE: solo para la fila de nuestra sesión
            },
            (payload) => {
                // payload.new.data contiene el estado actualizado de la app
                const serverData = payload.new.data;

                if (serverData && (!lastSyncedTimestamp.current || new Date(serverData.lastUpdated) > new Date(lastSyncedTimestamp.current))) {
                    console.log("¡Cambio detectado en tiempo real! Sincronizando...");
                    isLoadingFromServer.current = true;
                    dispatch({ type: 'SYNC_STATE', payload: serverData });
                    lastSyncedTimestamp.current = serverData.lastUpdated;
                    setTimeout(() => isLoadingFromServer.current = false, 0);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('¡Conectado al canal de tiempo real!');
            }
        });

    // Función de limpieza: Es VITAL desuscribirse cuando el componente se desmonte o el ID cambie
    return () => {
        supabase.removeChannel(channel);
    };
}, [shareId]); // El array de dependencias asegura que esto se re-ejecute si el shareId cambia


useEffect(() => {
    if (!initialLoadDone.current || isLoadingFromServer.current || !shareId || shareId.startsWith('local-')) {
        return;
    }
    if (!state.lastUpdated) {
        return;
    }
    if (isSaving.current) {
        return;
    }

    isSaving.current = true;
    setSaveStatus('saving');

    const dataToSave = {
        shareId: shareId,
        comensales,
        availableProducts: Object.fromEntries(availableProducts),
        masterProductList: Object.fromEntries(state.masterProductList),
        activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])),
        discountPercentage: state.discountPercentage,
        discountCap: state.discountCap,
        lastUpdated: state.lastUpdated
    };

    saveStateToSupabase(shareId, dataToSave)
        .then(() => {
            setSaveStatus('saved');
            hasPendingChanges.current = false;
        })
        .catch((e) => {
            console.error("El guardado falló:", e.message);
            setSaveStatus('error');
            lastFailedSaveData.current = dataToSave; 
        })
        .finally(() => {
            isSaving.current = false;
        });

}, [state.lastUpdated, shareId, authReady]); // <-- Asegúrate que el array de dependencias NO incluya retryTrigger



    const handleAddItem = useCallback((comensalId, productId) => {
        if (!productId) return;
        hasPendingChanges.current = true;
        dispatch({ type: 'ADD_ITEM', payload: { comensalId, productId } });
    }, [dispatch]); // <-- Dependencia solo de dispatch
    
    const handleRemoveItem = useCallback((comensalId, itemIdentifier) => {
        hasPendingChanges.current = true;
        dispatch({ type: 'REMOVE_ITEM_FROM_COMENSAL', payload: { comensalId, itemIdentifier } });
    }, [dispatch]); // <-- Dependencia solo de dispatch
    
    const handleShareItem = useCallback((productId, sharingComensalIds) => {
        hasPendingChanges.current = true;
        dispatch({ type: 'SHARE_ITEM', payload: { productId, sharingComensalIds } });
    }, [dispatch]); // <-- Dependencia solo de dispatch

    const handleAddComensal = useCallback(() => {
        if (newComensalName.trim() === '') {
            setAddComensalMessage({ type: 'error', text: 'Por favor, ingresa un nombre.' });
            return;
        }
        if (comensales.length >= MAX_COMENSALES) {
            setAddComensalMessage({ type: 'error', text: `No más de ${MAX_COMENSALES} comensales.` });
            return;
        }
        hasPendingChanges.current = true;
        dispatch({ type: 'ADD_COMENSAL', payload: newComensalName });
        setAddComensalMessage({ type: 'success', text: `¡"${newComensalName.trim()}" añadido!` });
        setNewComensalName('');
        setTimeout(() => setAddComensalMessage({ type: '', text: '' }), 3000);
    }, [newComensalName, comensales.length, dispatch]);
    
    
    const confirmClearComensal = useCallback(() => {
        if (comensalToClearId === null) return;
        hasPendingChanges.current = true;
        dispatch({ type: 'CLEAR_COMENSAL_ITEMS', payload: { comensalId: comensalToClearId } });
        setIsClearComensalModalOpen(false);
        setComensalToClearId(null);
    }, [comensalToClearId, dispatch]);
    
    
    const confirmRemoveComensal = useCallback(() => {
        if (comensalToRemoveId === null) return;
        hasPendingChanges.current = true;
        dispatch({ type: 'REMOVE_COMENSAL', payload: comensalToRemoveId });
        setIsRemoveComensalModalOpen(false);
        setComensalToRemoveId(null);
    }, [comensalToRemoveId, dispatch]);
    
    const openClearComensalModal = (comensalId) => { setComensalToClearId(comensalId); setIsClearComensalModalOpen(true); };
    const openRemoveComensalModal = (comensalId) => { setComensalToRemoveId(comensalId); setIsRemoveComensalModalOpen(true); };
    const handleImageUpload = (event) => { 
        const file = event.target.files[0]; 
        if (!file) return; 
        setIsImageProcessing(true); 
        setImageProcessingError(null); 
        const reader = new FileReader(); 
        // 👇 Línea corregida
        reader.onloadend = () => { analyzeImageWithGemini(reader.result.split(',')[1], file.type); }; 
        reader.onerror = () => { 
            setImageProcessingError("Error al cargar la imagen."); 
            setIsImageProcessing(false); 
        }; 
        reader.readAsDataURL(file); 
    }; // Dentro de tu componente App

// REEMPLAZA TU FUNCIÓN analyzeImageWithGemini COMPLETA CON ESTA VERSIÓN

const analyzeImageWithGemini = async (base64ImageData, mimeType) => {
  try {
    setIsImageProcessing(true); // Asegúrate de tener esta línea si la habías quitado
    setImageProcessingError(null); // Y esta para limpiar errores previos

    const apiUrl = '/api/analyzeImage'; 

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64ImageData, mimeType }), 
    });
      
    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(errorResult.message || `Error en el servidor: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error(result.error?.message || "No se pudo extraer información válida de la imagen.");
    }
    
    const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
    if (!parsedData.items || !Array.isArray(parsedData.items)) {
      throw new Error("La respuesta de la API no contiene una lista de ítems válida.");
    }

    const newProductsMap = new Map();
    parsedData.items.forEach(item => {
        const name = item.name?.trim();
        
        // --- LÓGICA CLAVE CORREGIDA Y VERIFICADA ---
        const totalValue = parseChileanNumber(String(item.price));
        const quantity = parseInt(item.quantity, 10) || 1;

        if (name && !isNaN(totalValue) && !isNaN(quantity) && quantity > 0) {
            
            // Buscamos si ya existe un ítem con el mismo nombre para agruparlos
            const existing = Array.from(newProductsMap.values()).find(p => p.name === name);
            
            if (existing) {
                // Si ya existe, sumamos la cantidad y el valor total, luego recalculamos el precio unitario
                const newQuantity = existing.quantity + quantity;
                const newTotalValue = (existing.price * existing.quantity) + totalValue;
                existing.quantity = newQuantity;
                existing.price = newTotalValue / newQuantity; // Recalcula el precio unitario promedio
            } else {
                // Si es un ítem nuevo, lo creamos
                const newId = generateUniqueId('item');
                newProductsMap.set(newId, {
                  id: newId,
                  name, 
                  // Punto CRÍTICO: Guardamos el PRECIO UNITARIO
                  price: totalValue / quantity, 
                  quantity,
                  // Punto CRÍTICO: Le decimos a la UI que el precio que vimos era el TOTAL
                  priceIsTotal: true 
                });
            }
        }
    });

    hasPendingChanges.current = true;
    dispatch({ type: 'SET_PRODUCTS_FOR_REVIEW', payload: newProductsMap });

  } catch (error) {
      console.error("Error al analizar:", error);
      setImageProcessingError(error.message);
  } finally {
      setIsImageProcessing(false);
  }
};
  const handleGenerateShareLink = () => {
        // CAMBIO: Muestra el modal de carga con el mensaje apropiado
        setLoadingMessage("Generando enlace...");
        setIsGeneratingLink(true);
    
        if (shareId && !shareId.startsWith('local-')) {
            const fullLink = `${window.location.origin}${window.location.pathname}?id=${shareId}`;
            dispatch({ type: 'SET_SHARE_LINK', payload: fullLink });
        } else {
            alert("La sesión aún no se ha creado en el servidor.");
        }
        
        // CAMBIO: Oculta el modal después de un breve momento
        setTimeout(() => {
            setIsGeneratingLink(false);
        }, 500); // 500ms para que el usuario perciba la acción
    };
    const handleOpenSummaryModal = () => { const totalGeneralSinPropina = comensales.reduce((total, c) => total + c.selectedItems.reduce((sub, item) => sub + (item.originalBasePrice || 0) * item.quantity, 0), 0); const totalDescuentoCalculado = Math.min(totalGeneralSinPropina * (discountPercentage / 100), discountCap || Infinity); const data = comensales.map(comensal => { const totalSinPropina = comensal.selectedItems.reduce((sum, item) => sum + ((item.originalBasePrice || 0) * (item.quantity || 0)), 0); const propina = totalSinPropina * TIP_PERCENTAGE; const proporcionDelComensal = totalGeneralSinPropina > 0 ? totalSinPropina / totalGeneralSinPropina : 0; const descuentoAplicado = totalDescuentoCalculado * proporcionDelComensal; const totalConPropina = totalSinPropina + propina - descuentoAplicado; return { id: comensal.id, name: comensal.name, totalSinPropina: Math.round(totalSinPropina), propina: Math.round(propina), descuentoAplicado: Math.round(descuentoAplicado), totalConPropina: Math.round(totalConPropina), items: comensal.selectedItems }; }); setSummaryData(data); setIsSummaryModalOpen(true); };
    const handlePrint = () => {
        const printContent = document.getElementById('print-source-content');
        if (!printContent) return;
        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (!printWindow) {
            alert('Permite las ventanas emergentes.');
            return;
        }
        // Escribe el contenido en la nueva ventana y la deja abierta
        printWindow.document.write(`<html><head><title>Resumen</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-8">${printContent.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus(); // Opcional: pone el foco en la nueva ventana
    };
    const renderStep = () => {
        switch (currentStep) {
            case 'landing': 
                return <LandingStep onStart={handleStartNewSession} />;
            case 'loading_session':
                return <LoadingSessionStep />;
            case 'loading':
                return (
                    <LoadingStep
                        onImageUpload={handleImageUpload}
                        onManualEntry={() => dispatch({ type: 'SET_PRODUCTS_FOR_REVIEW', payload: new Map() })}
                        isImageProcessing={isImageProcessing}
                        imageProcessingError={imageProcessingError}
                        onRestart={handleResetAll}
                    />
                );
            case 'reviewing': 
                return (
                    <ReviewStep
                        products={masterProductList}
                        onProductChange={handleProductChange}
                        onAddNewProduct={handleAddNewProduct}
                        onRemoveProduct={handleRemoveProduct}
                        onConfirm={() => dispatch({ type: 'SET_PRODUCTS_AND_ADVANCE', payload: masterProductList })}
                        onBack={handleResetAll}
                        discountPercentage={discountPercentage}
                        discountCap={discountCap}
                        dispatch={dispatch}
                    />
                );
            case 'assigning':
                return (
                    <AssigningStep
                        availableProducts={availableProducts}
                        comensales={comensales}
                        newComensalName={newComensalName}
                        setNewComensalName={setNewComensalName}
                        addComensalMessage={addComensalMessage}
                        onAddComensal={handleAddComensal}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        onOpenClearComensalModal={openClearComensalModal}
                        onOpenRemoveComensalModal={openRemoveComensalModal}
                        onOpenShareModal={() => setIsShareModalOpen(true)}
                        onOpenSummary={handleOpenSummaryModal}
                        onGoBack={() => dispatch({ type: 'SET_STEP', payload: 'reviewing' })}
                        onGenerateLink={handleGenerateShareLink}
                        onRestart={handleResetAll}
                        shareLink={shareLink}
                        discountPercentage={discountPercentage}
                        discountCap={discountCap}
                        saveStatus={saveStatus}
                        dispatch={dispatch} // <-- Prop necesaria para el botón "Reintentar"
onRetrySave={handleRetrySave}
                    />
                );
                return <p>Cargando...</p>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <LoadingModal isOpen={isGeneratingLink} message={loadingMessage} />
            <div className="max-w-4xl mx-auto p-4">{renderStep()}</div>
            <div style={{ display: 'none' }}>
                <div id="print-source-content">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Resumen de la Cuenta</h2>
                    <div className="space-y-6">
                        {summaryData.map(diner => (
                            <div key={diner.id} className="border-b border-dashed border-gray-300 pb-4 last:border-b-0" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">{diner.name}</h3>
                                <ul className="text-sm text-gray-700 pl-4 border-l-2 border-gray-200 my-3 space-y-1">
                                    {(diner.items || []).map((item, index) => (
                                        <li key={index} className="flex justify-between">
                                            <span>
                                                {item.type === ITEM_TYPES.SHARED
                                                    ? `(½) 1/${item.sharedByCount} × ${item.name}`
                                                    : `${item.quantity} × ${item.name}`}
                                            </span>
                                            <span>
                                                ${Math.round(item.originalBasePrice * item.quantity).toLocaleString('es-CL')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex justify-between text-gray-600"><span>Consumo (sin propina):</span><span>${diner.totalSinPropina.toLocaleString('es-CL')}</span></div>
                                {diner.descuentoAplicado > 0 && (<div className="flex justify-between text-green-600"><span>Descuento:</span><span>-${diner.descuentoAplicado.toLocaleString('es-CL')}</span></div>)}
                                <div className="flex justify-between text-gray-600"><span>Propina (10%):</span><span>${diner.propina.toLocaleString('es-CL')}</span></div>
                                <div className="flex justify-between text-xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-200"><span>TOTAL A PAGAR:</span><span>${diner.totalConPropina.toLocaleString('es-CL')}</span></div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t-2 border-solid border-gray-800">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">TOTAL GENERAL</h3>
                        <div className="flex justify-between text-lg text-gray-700"><span>Total Consumo (sin propina):</span><span>${summaryData.reduce((sum, d) => sum + d.totalSinPropina, 0).toLocaleString('es-CL')}</span></div>
                        <div className="flex justify-between text-lg text-green-600"><span>Total Descuento:</span><span>-${summaryData.reduce((sum, d) => sum + d.descuentoAplicado, 0).toLocaleString('es-CL')}</span></div>
                        <div className="flex justify-between text-lg text-gray-700"><span>Total Propina:</span><span>${summaryData.reduce((sum, d) => sum + d.propina, 0).toLocaleString('es-CL')}</span></div>
                        <div className="flex justify-between text-2xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-300"><span>GRAN TOTAL A PAGAR:</span><span>${summaryData.reduce((sum, d) => sum + d.totalConPropina, 0).toLocaleString('es-CL')}</span></div>
                    </div>
                </div>
            </div>
            <SummaryModal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} summaryData={summaryData} onPrint={handlePrint} />
            <ConfirmationModal isOpen={isClearComensalModalOpen} onClose={() => setIsClearComensalModalOpen(false)} onConfirm={confirmClearComensal} message="¿Seguro que deseas limpiar el consumo de este comensal?" confirmText="Limpiar" />
            <ConfirmationModal isOpen={isRemoveComensalModalOpen} onClose={() => setIsRemoveComensalModalOpen(false)} onConfirm={confirmRemoveComensal} message="¿Seguro que deseas eliminar a este comensal?" confirmText="Eliminar" />
            <ShareItemModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} availableProducts={availableProducts} comensales={comensales} onShareConfirm={handleShareItem} />
        </div>
    );
};

// --- COMPONENTES DE PASOS ---
const LandingStep = ({ onStart }) => ( 
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4"> 
        <div className="mb-8"> 
            <img 
              src="/logoCC.png" 
              alt="Logo CuentasClaras" 
              // Clase "shadow-lg" eliminada para mantener la transparencia
              className="w-48 h-auto mx-auto" 
            />
        </div> 
        <h1 className="text-5xl font-extrabold text-gray-800">CuentasClaras</h1> 
        <p className="text-lg text-gray-600 mt-4 max-w-md"> Divide la cuenta de forma fácil y rápida. Escanea el recibo y deja que nosotros hagamos el resto. </p> 
        <button onClick={onStart} className="mt-12 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"> Empezar </button> 
    </div> 
);
const LoadingStep = ({ onImageUpload, onManualEntry, isImageProcessing, imageProcessingError, onRestart }) => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
        <header className="mb-12">
            <h1 className="text-4xl font-extrabold text-blue-700 mb-2">Cargar la Cuenta</h1>
            <p className="text-lg text-gray-600">¿Cómo quieres ingresar los ítems?</p>
        </header>
        <div className="w-full max-w-sm space-y-5">
            <label
                htmlFor="file-upload"
                className={`w-full flex flex-col items-center px-6 py-8 bg-blue-600 text-white rounded-xl shadow-lg tracking-wide uppercase border border-blue-600 cursor-pointer hover:bg-blue-700 transition-all ${
                    isImageProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
                <svg
                    className="w-12 h-12 mb-3"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                >
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                </svg>
                <span className="text-lg font-semibold">Escanear Recibo</span>
                <span className="text-sm">Carga una foto</span>
                <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onImageUpload}
                    disabled={isImageProcessing}
                />
            </label>
            <button
                onClick={onManualEntry}
                disabled={isImageProcessing}
                className="w-full px-6 py-5 bg-white text-blue-600 font-semibold rounded-xl shadow-lg border border-gray-200 hover:bg-gray-100 transition-all disabled:opacity-50"
            >
                Ingresar Manualmente
            </button>
            <button
                onClick={onRestart}
                disabled={isImageProcessing}
                className="w-full px-6 py-5 bg-gray-200 text-gray-800 font-semibold rounded-xl shadow-lg hover:bg-gray-300 transition-all disabled:opacity-50"
            >
                Empezar de Nuevo
            </button>
        </div>
        {isImageProcessing && (
            <div className="mt-6 text-blue-600 font-semibold flex items-center justify-center">
                <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
                <span>Procesando...</span>
            </div>
        )}
        {imageProcessingError && (
            <p className="mt-4 text-red-600">Error: {imageProcessingError}</p>
        )}
    </div>
);
// --- EN TU ARCHIVO App.js ---
// Reemplaza tu componente ReviewStep completo con esta versión final

const ReviewStep = ({
    products,
    onProductChange,
    onAddNewProduct,
    onRemoveProduct,
    onConfirm,
    onBack,
    discountPercentage,
    discountCap,
    dispatch
}) => {
    const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' });
    const [localDiscounts, setLocalDiscounts] = useState({
        percentage: discountPercentage || '',
        cap: discountCap || ''
    });
    const [footerStyle, setFooterStyle] = useState({
        compactOpacity: 0,
        expandedOpacity: 1,
        containerHeight: 'auto'
    });

    useEffect(() => {
        setLocalDiscounts({
            percentage: discountPercentage || '',
            cap: discountCap || ''
        });
    }, [discountPercentage, discountCap]);
    
    useEffect(() => {
        const expandedHeight = 250; 
        const compactHeight = 88;
        const triggerZone = 200;

        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const scrollY = window.scrollY;
            
            if (scrollHeight <= clientHeight) {
                setFooterStyle({ compactOpacity: 0, expandedOpacity: 1, containerHeight: `${expandedHeight}px`});
                return;
            }

            const scrollFromBottom = scrollHeight - clientHeight - scrollY;
            const progress = 1 - (scrollFromBottom / triggerZone);
            const clampedProgress = Math.max(0, Math.min(1, progress));

            if (scrollY > 50 && scrollFromBottom > triggerZone) {
                 setFooterStyle({ compactOpacity: 1, expandedOpacity: 0, containerHeight: `${compactHeight}px` });
            } else {
                setFooterStyle({
                    compactOpacity: 1 - clampedProgress,
                    expandedOpacity: clampedProgress,
                    containerHeight: `${compactHeight + (expandedHeight - compactHeight) * clampedProgress}px`
                });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [products.size]);

    const handlePriceInputChange = (productId, newDisplayValue) => {
        const product = products.get(productId);
        if (!product) return;
        const numericValue = parseChileanNumber(String(newDisplayValue));
        const quantity = parseInt(product.quantity, 10) || 1;
        if (product.priceIsTotal) {
            onProductChange(productId, 'price', numericValue / quantity);
        } else {
            onProductChange(productId, 'price', numericValue);
        }
    };
    
    const handlePriceTypeToggle = (productId) => {
        const product = products.get(productId);
        if (!product) return;
        onProductChange(productId, 'priceIsTotal', !product.priceIsTotal);
    };

    const handleAddNewItemClick = () => {
        if (!newItem.name.trim()) { alert('Por favor, ingresa un nombre válido.'); return; }
        const price = parseChileanNumber(newItem.price);
        const quantity = parseInt(newItem.quantity, 10);
        if (isNaN(price) || price <= 0) { alert('El precio debe ser un número positivo.'); return; }
        if (isNaN(quantity) || quantity <= 0) { alert('La cantidad debe ser un número entero positivo.'); return; }
        onAddNewProduct({ 
            name: newItem.name.trim(), 
            price, 
            quantity, 
            priceIsTotal: false
        });
        setNewItem({ name: '', price: '', quantity: '1' });
    };

    const handleLocalDiscountChange = (e) => {
        const { name, value } = e.target;
        setLocalDiscounts(prev => ({ ...prev, [name]: value }));
    };

    const handleDiscountBlur = () => {
        dispatch({
            type: 'APPLY_DISCOUNT',
            payload: {
                percentage: localDiscounts.percentage,
                cap: localDiscounts.cap
            }
        });
    };

    const total = Array.from(products.values()).reduce((sum, p) => (sum + (p.price || 0) * (p.quantity || 1)), 0);
    const potentialDiscount = total * (discountPercentage / 100);
    const actualDiscount = (discountPercentage > 0 && discountCap > 0) ? Math.min(potentialDiscount, discountCap) : (discountPercentage > 0 ? potentialDiscount : 0);
    const tip = total * TIP_PERCENTAGE;
    const grandTotal = total - actualDiscount + tip;
    
    return (
        <div className="p-4" style={{ paddingBottom: '260px' }}> 
            <header className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-blue-700">Revisa y Ajusta la Cuenta</h1>
                <p className="text-gray-600">Asegúrate que los ítems y precios coincidan con tu recibo.</p>
            </header>
            
            <div className="bg-white p-3 rounded-xl shadow-md mb-6">
                <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer list-none">
                        <span className="text-md font-bold text-blue-600">Aplicar Descuento</span>
                        <svg className="w-5 h-5 text-gray-500 transition-transform transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </summary>
                    <div className="mt-4 flex items-center gap-3 w-full">
                        <input type="number" name="percentage" placeholder="%" value={localDiscounts.percentage} onChange={handleLocalDiscountChange} onBlur={handleDiscountBlur} className="p-2 border rounded-md w-full" min="0" max="100" aria-label="Porcentaje descuento"/>
                        <input type="number" name="cap" placeholder="Tope ($)" value={localDiscounts.cap} onChange={handleLocalDiscountChange} onBlur={handleDiscountBlur} className="p-2 border rounded-md w-full" min="0" aria-label="Tope descuento"/>
                    </div>
                </details>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 space-y-4">
                 <h2 className="text-lg font-bold">Ítems Cargados</h2>
                 {Array.from(products.values()).map(p => {
                    const displayPrice = p.priceIsTotal ? (p.price || 0) * (p.quantity || 1) : (p.price || 0);
                    return (
                        <div key={p.id} className="grid grid-cols-12 gap-x-2 md:gap-x-4 items-center border-b border-gray-200 py-3">
                            <div className="col-span-12 md:col-span-5"><input type="text" value={p.name} onChange={e => onProductChange(p.id, 'name', e.target.value)} className="w-full p-2 border rounded-md" aria-label="Nombre del ítem"/></div>
                            <div className="col-span-3 md:col-span-2 mt-2 md:mt-0"><input type="number" value={p.quantity} onChange={e => onProductChange(p.id, 'quantity', e.target.value)} className="w-full p-2 border rounded-md text-center" aria-label="Cantidad" min="1"/></div>
                            <div className="col-span-9 md:col-span-5 mt-2 md:mt-0 flex items-center gap-2 justify-end">
                                <span className="text-gray-400">$</span>
                                <input type="text" inputMode="decimal" value={displayPrice.toLocaleString('es-CL')} onChange={e => handlePriceInputChange(p.id, e.target.value)} className="p-2 border rounded-md text-right w-24" aria-label="Precio"/>
                                <div className="flex items-center" title="Marcar si el precio ingresado es por el total de las unidades">
                                    <input type="checkbox" id={`is-total-${p.id}`} checked={p.priceIsTotal || false} onChange={() => handlePriceTypeToggle(p.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    <label htmlFor={`is-total-${p.id}`} className="ml-2 text-xs text-gray-600">Es Total</label>
                                </div>
                                <button onClick={() => onRemoveProduct(p.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" aria-label={`Eliminar ${p.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                    );
                 })}
                 <div className="flex flex-col md:grid md:grid-cols-12 md:gap-x-4 md:items-center pt-4">
                    <div className="col-span-5"><input type="text" placeholder="Nombre nuevo ítem" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2 border rounded-md bg-gray-50" aria-label="Nombre nuevo ítem"/></div>
                    <div className="flex items-center gap-x-4 mt-2 md:mt-0 md:col-span-7">
                        <div className="w-1/3 md:w-auto md:col-span-2"><input type="number" placeholder="Cant." value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full p-2 border rounded-md text-center bg-gray-50" aria-label="Cantidad nuevo ítem" min="1"/></div>
                        <div className="flex-grow md:col-span-3 relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input type="text" inputMode="decimal" placeholder="Precio Unit." value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-2 border rounded-md text-right pl-6 bg-gray-50" aria-label="Precio nuevo ítem" min="0"/>
                        </div>
                        <div className="md:col-span-1"><button onClick={handleAddNewItemClick} className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-full" aria-label="Agregar ítem"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></button></div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-top z-10 transition-height duration-300 ease-in-out" style={{ height: footerStyle.containerHeight }}>
                <div className="max-w-4xl mx-auto p-4 h-full flex flex-col justify-end">
                    <div className="relative h-full">
                        <div className="transition-opacity duration-200 absolute inset-0" style={{ opacity: footerStyle.expandedOpacity, pointerEvents: footerStyle.expandedOpacity < 0.5 ? 'none' : 'auto' }}>
                            <div className="bg-blue-50 p-4 rounded-xl shadow-inner mb-4">
                                <div className="flex justify-between text-base"><span className="font-semibold text-gray-700">Subtotal:</span><span className="font-bold">${Math.round(total).toLocaleString('es-CL')}</span></div>
                                {actualDiscount > 0 && (<div className="flex justify-between text-base"><span className="font-semibold text-green-600">Descuento:</span><span className="font-bold text-green-600">-${Math.round(actualDiscount).toLocaleString('es-CL')}</span></div>)}
                                <div className="flex justify-between text-base"><span className="font-semibold text-gray-700">Propina ({TIP_PERCENTAGE*100}%):</span><span className="font-bold">${Math.round(tip).toLocaleString('es-CL')}</span></div>
                                <div className="flex justify-between text-xl font-extrabold text-blue-800 mt-2 pt-2 border-t border-blue-200"><span>TOTAL:</span><span>${Math.round(grandTotal).toLocaleString('es-CL')}</span></div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={onBack} className="w-full py-3 px-5 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300">Empezar de Nuevo</button>
                                <button onClick={onConfirm} className="w-full py-3 px-5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Todo Correcto, Continuar</button>
                            </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4 transition-opacity duration-200" style={{ opacity: footerStyle.compactOpacity, pointerEvents: footerStyle.compactOpacity < 0.5 ? 'none' : 'auto' }}>
                             <div className="max-w-4xl mx-auto flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl font-extrabold text-blue-800">
                                        <span>TOTAL: </span>
                                        <span>${Math.round(grandTotal).toLocaleString('es-CL')}</span>
                                    </div>
                                    {/* --- NUEVO: INDICADOR DE DESCUENTO EN VISTA COMPACTA --- */}
                                    {actualDiscount > 0 && (
                                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                            -${Math.round(actualDiscount).toLocaleString('es-CL')}
                                        </span>
                                    )}
                                </div>
                                <button onClick={onConfirm} className="py-3 px-8 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Continuar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
    // --- EN TU ARCHIVO App.js ---
// Reemplaza tu componente AssigningStep completo con esta versión reordenada

const AssigningStep = ({
    availableProducts, comensales, newComensalName, setNewComensalName, addComensalMessage, onAddComensal,
    onAddItem, onRemoveItem, onOpenClearComensalModal, onOpenRemoveComensalModal, onOpenShareModal, onOpenSummary,
    onGoBack, onGenerateLink, onRestart, shareLink, discountPercentage, discountCap, saveStatus, dispatch, onRetrySave
}) => {
    
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const comensalesContainerRef = useRef(null);
    const prevComensalesLength = useRef(comensales.length);

    useEffect(() => {
        if (comensales.length > prevComensalesLength.current && prevComensalesLength.current === 0) {
            setTimeout(() => {
                comensalesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100); 
        }
        prevComensalesLength.current = comensales.length;
    }, [comensales.length]);

    const totalGeneralSinPropina = comensales.reduce((total, c) => total + c.selectedItems.reduce((sub, item) => sub + (item.originalBasePrice || 0) * item.quantity, 0), 0);
    const totalDescuentoCalculado = Math.min(totalGeneralSinPropina * (discountPercentage / 100), discountCap || Infinity);
    const unassignedItems = Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0);
    const totalUnassignedQuantity = unassignedItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    const ComensalCard = ({ comensal }) => {
        const totalSinPropina = comensal.selectedItems.reduce((sum, item) => sum + ((item.originalBasePrice || 0) * item.quantity), 0);
        const propina = totalSinPropina * TIP_PERCENTAGE;
        const proporcionDelComensal = totalGeneralSinPropina > 0 ? totalSinPropina / totalGeneralSinPropina : 0;
        const descuentoAplicado = totalDescuentoCalculado * proporcionDelComensal;
        const totalAPagar = totalSinPropina + propina - descuentoAplicado;

        return (
            <div className="bg-white p-5 rounded-xl shadow-lg flex flex-col h-full animate-fade-in">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{comensal.name}</h3>
                <div className="mb-4">
                    <label htmlFor={`product-select-${comensal.id}`} className="block text-sm font-medium text-gray-700 mb-1">Agregar Ítem:</label>
                    <select id={`product-select-${comensal.id}`} value="" onChange={(e) => onAddItem(comensal.id, e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm">
                        <option value="" disabled>Selecciona un producto</option>
                        {Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0).map(product => (<option key={product.id} value={product.id}>{product.name} (${Number(product.price).toLocaleString('es-CL')}) (Disp: {Number(product.quantity)})</option>))}
                    </select>
                </div>
                <div className="flex-grow min-h-[80px]">
                    {comensal.selectedItems.length > 0 ? (
                        <ul className="space-y-2 mb-4 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto">
                            {comensal.selectedItems.map((item, index) => (
                                <li key={`${item.id}-${item.shareInstanceId || index}-${index}`} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700">{item.type === ITEM_TYPES.SHARED ? `1/${Number(item.sharedByCount)} x ${item.name}` : `${Number(item.quantity)} x ${item.name}`}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-900">${Math.round(Number(item.originalBasePrice) * Number(item.quantity)).toLocaleString('es-CL')}</span>
                                        <button onClick={() => onRemoveItem(comensal.id, item.type === ITEM_TYPES.SHARED ? item.shareInstanceId : item.id)} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none" aria-label="Remove item">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (<p className="text-center text-gray-500 text-sm py-4">Aún no hay ítems.</p>)}
                </div>
                <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600"><span>Consumo:</span><span>${Math.round(totalSinPropina).toLocaleString('es-CL')}</span></div>
                    {descuentoAplicado > 0 && (<div className="flex justify-between text-sm text-green-600"><span>Descuento ({discountPercentage}%):</span><span>-${Math.round(descuentoAplicado).toLocaleString('es-CL')}</span></div>)}
                    <div className="flex justify-between text-sm text-gray-600"><span>Propina ({TIP_PERCENTAGE * 100}%):</span><span>${Math.round(propina).toLocaleString('es-CL')}</span></div>
                    <div className="flex justify-between items-center text-xl font-bold text-blue-700 mt-1"><span>TOTAL A PAGAR:</span><span className="text-2xl">${Math.round(totalAPagar).toLocaleString('es-CL')}</span></div>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => onOpenClearComensalModal(comensal.id)} className="w-full bg-orange-100 text-orange-700 py-2 px-4 rounded-md shadow-sm hover:bg-orange-200 text-sm">Limpiar</button>
                    <button onClick={() => onOpenRemoveComensalModal(comensal.id)} className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-md shadow-sm hover:bg-red-200 text-sm">Eliminar</button>
                </div>
            </div>
        )
    };

    return (
        <div className="pb-24">
            <header className="mb-6 text-center">
                <h1 className="text-3xl font-extrabold text-blue-700 mb-2">Asignar Consumos</h1>
                <p className="text-gray-600">Agrega comensales y asígnales lo que consumieron.</p>
                <div className="h-6 mt-2 flex justify-center items-center">
                    {/* ... (código de estado de guardado no cambia) ... */}
                </div>
                <button onClick={onGoBack} className="mt-2 text-sm text-blue-600 hover:underline">&larr; Volver y Editar Ítems</button>
            </header>

            {/* --- CAMBIO: SECCIÓN DE HERRAMIENTAS (AHORA ARRIBA) --- */}
            <div className="bg-gray-100 rounded-xl mb-6 border border-gray-200">
                <button onClick={() => setIsToolsOpen(!isToolsOpen)} className="w-full flex justify-between items-center text-left p-4">
                    <h2 className="text-lg font-bold text-gray-700">Otras Herramientas</h2>
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isToolsOpen && (
                    <div className="p-4 border-t border-gray-200 animate-fade-in-down">
                        <div className="space-y-3">
                            <button onClick={onGenerateLink} className="w-full flex items-center justify-center text-left p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                <span className="font-semibold">Generar Link de Sesión</span>
                            </button>
                            <button onClick={onRestart} className="w-full flex items-center justify-center text-left p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5" /><path d="M4 9a9 9 0 0114.65-4.65l-2.12 2.12a5 5 0 00-9.07 4.53" /><path d="M20 15a9 9 0 01-14.65 4.65l2.12-2.12a5 5 0 009.07-4.53" /></svg>
                                <span className="font-semibold">Empezar de Nuevo</span>
                            </button>
                        </div>
                        {shareLink && ( <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200"> <p className="font-semibold text-green-800">¡Enlace generado!</p> <input type="text" readOnly value={shareLink} className="w-full mt-2 p-2 border rounded-md bg-white text-center text-sm" onFocus={(e) => e.target.select()} /> <button onClick={() => navigator.clipboard.writeText(shareLink).then(() => alert('¡Enlace copiado!'))} className="mt-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700">Copiar</button> </div> )}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN DE AÑADIR COMENSAL --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-xl font-bold text-blue-600 mb-4">Agregar Nuevo Comensal</h2>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input type="text" placeholder="Nombre del Comensal" value={newComensalName} onChange={(e) => setNewComensalName(e.target.value)} className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full" />
                    <button onClick={onAddComensal} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 w-full sm:w-auto">Añadir</button>
                </div>
                {addComensalMessage.text && (<p className={`mt-3 text-center text-sm ${addComensalMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{addComensalMessage.text}</p>)}
                <div className="text-center mt-4 text-gray-600 font-semibold">
                    Comensales Agregados: {comensales.length}
                </div>
            </div>

            {/* --- ACCIÓN PRINCIPAL "COMPARTIR ÍTEM" --- */}
            <div className="mb-6">
                 <button onClick={onOpenShareModal} className="w-full flex items-center justify-center text-left p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 text-indigo-800 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                    <span className="font-bold text-lg">Compartir un Ítem</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={comensalesContainerRef}>
                {comensales.map(comensal => ( <ComensalCard key={comensal.id} comensal={comensal} /> ))}
            </div>
            
            {comensales.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 print:hidden">
                    <button onClick={onOpenSummary} className="w-full max-w-4xl mx-auto py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-transform hover:scale-105 flex flex-col items-center">
                        <span className="text-lg">Ver Resumen Final</span>
                        {totalUnassignedQuantity > 0 && (
                            <span className="text-xs font-normal opacity-90">
                                Faltan {totalUnassignedQuantity} {totalUnassignedQuantity > 1 ? 'ítems' : 'ítem'} por asignar
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
};

export default App;
