import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';

// Polyfill para 'process' si no está definido
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {} };
}

// --- FUNCIÓN AUXILIAR PARA IDs ÚNICOS ---
const generateUniqueId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;


// --- CONSTANTES ---
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzI_sW6-SKJy8K3M1apb_hdmafjE9gz8ZF7UPrYKfeI5eBGDKmqagl6HLxnB0ILeY67JA/exec";
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

  const sharableProducts = Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0);

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
};

// Reemplaza tu función billReducer completa con esta versión
function billReducer(state, action) {
    // --- FUNCIÓN AUXILIAR PARA RECALCULAR EL INVENTARIO ---
    const recalculateAvailableProducts = (masterList, comensales) => {
        if (!masterList || masterList.size === 0) {
            return new Map();
        }
        const newAvailableProducts = new Map(JSON.parse(JSON.stringify(Array.from(masterList))));
        comensales.forEach(diner => {
            (diner.selectedItems || []).forEach(item => {
                const productInMap = newAvailableProducts.get(item.id);
                if (productInMap) {
                    const quantityToRemove = item.type === ITEM_TYPES.SHARED ? 1 : item.quantity;
                    productInMap.quantity -= quantityToRemove;
                }
            });
        });
        return newAvailableProducts;
    };

    switch (action.type) {
        // --- ACCIONES DE ESTADO GENERAL (SIN CAMBIOS) ---
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
            return { ...state, discountPercentage: parseFloat(percentage) || 0, discountCap: parseFloat(cap) || 0 };
        }
        case 'ADD_COMENSAL': {
            if (state.comensales.length >= MAX_COMENSALES) return state;
            const newComensalId = generateUniqueId('diner');
            const newComensal = { id: newComensalId, name: action.payload.trim(), selectedItems: [], total: 0 };
            return { ...state, comensales: [...state.comensales, newComensal] };
        }
        case 'REMOVE_COMENSAL': {
            const comensalIdToRemove = action.payload;
            const newComensales = state.comensales.filter(c => c.id !== comensalIdToRemove);
            return { ...state, comensales: newComensales };
        }

        // --- LÓGICA DE SINCRONIZACIÓN Y ESTADO INICIAL ---
        case 'LOAD_STATE': {
            const { comensales, availableProducts, activeSharedInstances, shareId, lastUpdated } = action.payload;
            const productsMap = new Map(Object.entries(availableProducts || {}));
            const masterList = new Map(JSON.parse(JSON.stringify(Array.from(productsMap))));
            return {
                ...state,
                comensales,
                activeSharedInstances: new Map(Object.entries(activeSharedInstances || {}).map(([key, value]) => [Number(key), new Set(value)])),
                shareId,
                lastUpdated: lastUpdated || null,
                masterProductList: masterList,
                availableProducts: recalculateAvailableProducts(masterList, comensales)
            };
        }
        case 'SET_PRODUCTS_FOR_REVIEW':
             return {
                ...state,
                availableProducts: action.payload,
                masterProductList: new Map(),
                comensales: [],
                discountPercentage: 0,
                discountCap: 0,
                currentStep: 'reviewing'
            };
        case 'SET_PRODUCTS_AND_ADVANCE':
            return {
                ...state,
                masterProductList: new Map(action.payload),
                availableProducts: new Map(action.payload),
                currentStep: 'assigning'
            };
        case 'SYNC_STATE': {
            const serverStateData = action.payload;
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
                        } else if (!localItem && serverItem) {
                            finalItems.push(serverItem);
                        } else {
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
                comensales: reconciledComensales,
                activeSharedInstances: new Map(Object.entries(serverStateData.activeSharedInstances || {}).map(([key, value]) => [Number(key), new Set(value)])),
                lastUpdated: serverStateData.lastUpdated,
                availableProducts: recalculateAvailableProducts(state.masterProductList, reconciledComensales),
            };
        }

        // --- ACCIONES LOCALES QUE RECALCULAN EL INVENTARIO ---
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
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales)
            };
        }
        case 'SHARE_ITEM': {
            const { productId, sharingComensalIds } = action.payload;
            const productToShare = state.availableProducts.get(productId);
            if (!productToShare || !sharingComensalIds || sharingComensalIds.length === 0 || state.availableProducts.get(productId).quantity < 1) return state;

            const shareInstanceId = Date.now() + Math.random();
            const newActiveSharedInstances = new Map(state.activeSharedInstances).set(shareInstanceId, new Set(sharingComensalIds));
            const basePricePerShare = Number(productToShare.price) / Number(sharingComensalIds.length);
            const newItemData = {
                id: productToShare.id, name: productToShare.name,
                originalBasePrice: basePricePerShare, quantity: 1, type: ITEM_TYPES.SHARED,
                sharedByCount: Number(sharingComensalIds.length), shareInstanceId: shareInstanceId,
                modifiedAt: new Date().toISOString(),
            };

            const newComensales = state.comensales.map(comensal => {
                if (sharingComensalIds.includes(comensal.id)) {
                    return { ...comensal, selectedItems: [...comensal.selectedItems, newItemData] };
                }
                return comensal;
            });
            return {
                ...state,
                comensales: newComensales,
                activeSharedInstances: newActiveSharedInstances,
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales)
            };
        }
        case 'REMOVE_ITEM_FROM_COMENSAL': {
            const { comensalId, itemIdentifier } = action.payload;
            let comensalTarget = state.comensales.find(c => c.id === comensalId);
            if (!comensalTarget) return state;
            const itemIndex = comensalTarget.selectedItems.findIndex(item => (item.type === ITEM_TYPES.SHARED && String(item.shareInstanceId) === String(itemIdentifier)) || (item.type === ITEM_TYPES.FULL && item.id === itemIdentifier));
            if (itemIndex === -1) return state;

            const itemToRemove = { ...comensalTarget.selectedItems[itemIndex] };
            let newComensales = [...state.comensales];
            let newSharedInstances = new Map(state.activeSharedInstances);

            if (itemToRemove.type === ITEM_TYPES.FULL) {
                newComensales = state.comensales.map(c => {
                    if (c.id === comensalId) {
                        const updatedItems = [...c.selectedItems];
                        if (updatedItems[itemIndex].quantity > 1) {
                            updatedItems[itemIndex].quantity -= 1;
                            updatedItems[itemIndex].modifiedAt = new Date().toISOString();
                        } else {
                            updatedItems.splice(itemIndex, 1);
                        }
                        return { ...c, selectedItems: updatedItems };
                    }
                    return c;
                });
            } else { // SHARED
                const { shareInstanceId } = itemToRemove;
                const shareGroup = newSharedInstances.get(shareInstanceId);
                if (!shareGroup) return state;
                shareGroup.delete(comensalId);
                
                let tempComensales = state.comensales.map(c => ({
                    ...c,
                    selectedItems: c.selectedItems.filter(i => String(i.shareInstanceId) !== String(shareInstanceId))
                }));
                
                if (shareGroup.size === 0) {
                    newSharedInstances.delete(shareInstanceId);
                } else {
                    const totalItemBasePrice = itemToRemove.originalBasePrice * itemToRemove.sharedByCount;
                    const newBasePricePerShare = totalItemBasePrice / shareGroup.size;
                    const updatedItemData = {
                        ...itemToRemove,
                        originalBasePrice: newBasePricePerShare,
                        sharedByCount: shareGroup.size,
                        modifiedAt: new Date().toISOString()
                    };
                    tempComensales = tempComensales.map(c => {
                        if (shareGroup.has(c.id)) {
                            return { ...c, selectedItems: [...c.selectedItems, updatedItemData] };
                        }
                        return c;
                    });
                }
                newComensales = tempComensales;
            }

            return {
                ...state,
                comensales: newComensales,
                activeSharedInstances: newSharedInstances,
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales)
            };
        }
        case 'CLEAR_COMENSAL_ITEMS': {
            const { comensalId } = action.payload;
            const newComensales = state.comensales.map(c => c.id === comensalId ? { ...c, selectedItems: [] } : c);
            return {
                ...state,
                comensales: newComensales,
                availableProducts: recalculateAvailableProducts(state.masterProductList, newComensales)
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
                shareId: `local-session-${Date.now()}`
            };
        }
        default:
            return state;
    }
}

// --- Componente principal de la aplicación ---
const App = () => {
    const [state, dispatch] = useReducer(billReducer, initialState);
    const { currentStep, userId, shareId, shareLink, availableProducts, comensales, activeSharedInstances, discountPercentage, discountCap } = state;

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

    // ... (El resto de las funciones de App.js no cambian, excepto las marcadas) ...
    const saveStateToGoogleSheets = useCallback(async (currentShareId, dataToSave) => {
        if (GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE") || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) { return Promise.reject(new Error("URL de Apps Script inválida.")); }
        if (!currentShareId || !userId) return Promise.resolve();
        const promiseWithTimeout = new Promise((resolve, reject) => { const timeoutId = setTimeout(() => { reject(new Error('El guardado ha tardado demasiado y fue cancelado (timeout).')); }, 8000); const callbackName = 'jsonp_callback_save_' + Math.round(100000 * Math.random()); const script = document.createElement('script'); const cleanup = () => { clearTimeout(timeoutId); if (document.body.contains(script)) document.body.removeChild(script); delete window[callbackName]; }; window[callbackName] = (data) => { cleanup(); resolve(data); }; script.onerror = () => { cleanup(); reject(new Error('Error de red al guardar los datos en Google Sheets.')); }; const dataString = JSON.stringify(dataToSave); const encodedData = encodeURIComponent(dataString); script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=save&id=${currentShareId}&data=${encodedData}&callback=${callbackName}`; document.body.appendChild(script); });
        try { const result = await promiseWithTimeout; if (result.status === 'error') return Promise.reject(new Error(result.message)); return Promise.resolve();
        } catch (error) { return Promise.reject(error); }
    }, [userId]);
    const handleResetAll = useCallback(() => { dispatch({ type: 'RESET_SESSION' }); }, []);
    const loadStateFromGoogleSheets = useCallback(async (idToLoad) => {
        if (GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE") || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) return;
        if (!idToLoad || idToLoad.startsWith('local-')) return;
        const callbackName = 'jsonp_callback_load_' + Math.round(100000 * Math.random());
        const promise = new Promise((resolve, reject) => { const script = document.createElement('script'); window[callbackName] = (data) => { if(document.body.contains(script)) document.body.removeChild(script); delete window[callbackName]; resolve(data); }; script.onerror = () => { if(document.body.contains(script)) document.body.removeChild(script); delete window[callbackName]; reject(new Error('Error al cargar los datos desde Google Sheets.')); }; script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=load&id=${idToLoad}&callback=${callbackName}`; document.body.appendChild(script); });
        try {
            const data = await promise;
            if (data && data.status !== "not_found") {
                // --- LÓGICA DE SINCRONIZACIÓN MEJORADA ---

                // Si es la carga inicial, cargamos el estado completamente.
                if (!initialLoadDone.current) {
                    isLoadingFromServer.current = true;
                    const loadedProducts = new Map(Object.entries(data.availableProducts || {}));
                    const loadedSharedInstances = new Map(Object.entries(data.activeSharedInstances || {}).map(([key, value]) => [Number(key), new Set(value)]));
                    
                    dispatch({ type: 'LOAD_STATE', payload: { ...data, availableProducts: loadedProducts, activeSharedInstances: loadedSharedInstances } });
                    lastSyncedTimestamp.current = data.lastUpdated; // Establecer la fecha inicial

                    if (loadedProducts.size > 0 || (data.comensales && data.comensales.length > 0)) {
                        dispatch({ type: 'SET_STEP', payload: 'assigning' });
                    } else {
                        dispatch({ type: 'SET_STEP', payload: 'reviewing' });
                    }
                } else {
                    // Si es un sondeo (polling), comparamos las fechas antes de actualizar.
                    const isServerStateNewer = !lastSyncedTimestamp.current || new Date(data.lastUpdated) > new Date(lastSyncedTimestamp.current);
                    
                    if (isServerStateNewer && !hasPendingChanges.current) {
                        isLoadingFromServer.current = true;
                        dispatch({ type: 'SYNC_STATE', payload: data });
                        lastSyncedTimestamp.current = data.lastUpdated; // Actualizar a la nueva fecha
                    }
                }
            } else {
                 if (idToLoad === justCreatedSessionId.current) { console.warn("La sesión recién creada aún no está disponible para lectura."); return; }
                 alert("La sesión compartida no fue encontrada. Se ha iniciado una nueva sesión local.");
                 handleResetAll();
            }
        } catch (error) { console.error("Error al cargar con JSONP:", error);
        } finally { 
            // Usamos un timeout para asegurar que el flag se desactive después de que el render se complete
            setTimeout(() => { 
                isLoadingFromServer.current = false; 
                if (!initialLoadDone.current) {
                    initialLoadDone.current = true;
                }
            }, 0); 
        }
    }, [handleResetAll]);
    useEffect(() => {
        const uniqueSessionUserId = localStorage.getItem('billSplitterUserId');
        if (uniqueSessionUserId) { dispatch({ type: 'SET_USER_ID', payload: uniqueSessionUserId });
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
                // El estado inicial ya es 'loading_session', solo cargamos los datos
                await loadStateFromGoogleSheets(idFromUrl);
            } else { 
                dispatch({ type: 'SET_SHARE_ID', payload: `local-session-${Date.now()}` }); 
            }
            initialLoadDone.current = true;
        };
        performInitialLoad();
    }, [authReady, userId, loadStateFromGoogleSheets]);
    useEffect(() => {
        const isAnyModalOpen = isShareModalOpen || isClearComensalModalOpen || isRemoveComensalModalOpen || isSummaryModalOpen;
        if (!shareId || shareId.startsWith('local-') || !userId || isAnyModalOpen || GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE")) return;
        let isCancelled = false; const pollTimeout = 5000; let pollTimer;
        const poll = () => {
            if (isCancelled) return;
            // No llamar si hay cambios locales pendientes de guardar
            if (!hasPendingChanges.current) { 
                loadStateFromGoogleSheets(shareId).finally(() => { 
                    if (!isCancelled) pollTimer = setTimeout(poll, pollTimeout); 
                });
            } else { 
                if (!isCancelled) pollTimer = setTimeout(poll, pollTimeout); 
            }
        };
        pollTimer = setTimeout(poll, pollTimeout);
        return () => { isCancelled = true; clearTimeout(pollTimer); };
    }, [shareId, userId, loadStateFromGoogleSheets, isShareModalOpen, isClearComensalModalOpen, isRemoveComensalModalOpen, isSummaryModalOpen]);

    useEffect(() => {
        if (isLoadingFromServer.current) return;
        if (!initialLoadDone.current || !shareId || shareId.startsWith('local-') || !authReady || isImageProcessing) return;
        
        hasPendingChanges.current = true;
        const handler = setTimeout(() => {
            const dataToSave = { 
                comensales, 
                availableProducts: Object.fromEntries(availableProducts), 
                activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])), 
                lastUpdated: new Date().toISOString() // Incluir siempre la fecha de la última modificación
            };
            saveStateToGoogleSheets(shareId, dataToSave)
                .catch((e) => { console.error("El guardado falló:", e.message); alert(`No se pudieron guardar los últimos cambios: ${e.message}`); })
                .finally(() => { hasPendingChanges.current = false; });
        }, 1000);
        return () => clearTimeout(handler);
    }, [comensales, availableProducts, activeSharedInstances, shareId, saveStateToGoogleSheets, authReady, isImageProcessing]);

    const handleAddItem = (comensalId, productId) => { dispatch({ type: 'ADD_ITEM', payload: { comensalId, productId } }); };
    const handleRemoveItem = (comensalId, itemIdentifier) => { dispatch({ type: 'REMOVE_ITEM_FROM_COMENSAL', payload: { comensalId, itemIdentifier } }); };
    const handleShareItem = (productId, sharingComensalIds) => { dispatch({ type: 'SHARE_ITEM', payload: { productId, sharingComensalIds } }); };
    const handleAddComensal = () => { if (newComensalName.trim() === '') { setAddComensalMessage({ type: 'error', text: 'Por favor, ingresa un nombre.' }); return; } if (comensales.length >= MAX_COMENSALES) { setAddComensalMessage({ type: 'error', text: `No más de ${MAX_COMENSALES} comensales.` }); return; } dispatch({ type: 'ADD_COMENSAL', payload: newComensalName }); setAddComensalMessage({ type: 'success', text: `¡"${newComensalName.trim()}" añadido!` }); setNewComensalName(''); setTimeout(() => setAddComensalMessage({ type: '', text: '' }), 3000); };
    const confirmClearComensal = () => { if (comensalToClearId !== null) dispatch({ type: 'CLEAR_COMENSAL_ITEMS', payload: comensalToClearId }); setIsClearComensalModalOpen(false); setComensalToClearId(null); };
    const openClearComensalModal = (comensalId) => { setComensalToClearId(comensalId); setIsClearComensalModalOpen(true); };
    const confirmRemoveComensal = () => { if (comensalToRemoveId !== null) { dispatch({ type: 'CLEAR_COMENSAL_ITEMS', payload: comensalToRemoveId }); dispatch({ type: 'REMOVE_COMENSAL', payload: comensalToRemoveId }); } setIsRemoveComensalModalOpen(false); setComensalToRemoveId(null); };
    const openRemoveComensalModal = (comensalId) => { setComensalToRemoveId(comensalId); setIsRemoveComensalModalOpen(true); };
    const handleImageUpload = (event) => { const file = event.target.files[0]; if (!file) return; setIsImageProcessing(true); setImageProcessingError(null); const reader = new FileReader(); reader.onloadend = () => { analyzeImageWithGemini(reader.result.split(',')[1], file.type); }; reader.onerror = () => { setImageProcessingError("Error al cargar la imagen."); setIsImageProcessing(false); }; reader.readAsDataURL(file); };
    const analyzeImageWithGemini = async (base64ImageData, mimeType) => { try { const prompt = `Analiza la imagen de un recibo o boleta de restaurante...`; const payload = { contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64ImageData } }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { "items": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "name": { "type": "STRING" }, "quantity": { "type": "INTEGER" }, "price": { "type": "NUMBER" } }, "required": ["name", "quantity", "price"] } } }, required: ["items"] } } }; const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyDMhW9Fxz2kLG7HszVnBDmgQMJwzXSzd9U"; if (apiKey.includes("YOUR")) throw new Error("Falta la clave de API de Gemini."); const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`; const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json(); if (result.candidates && result.candidates[0].content.parts[0].text) { const parsedData = JSON.parse(result.candidates[0].content.parts[0].text); const newProductsMap = new Map(); (parsedData.items || []).forEach(item => { const name = item.name.trim(); const price = parseFloat(String(item.price).replace(/\./g, '')); const quantity = parseInt(item.quantity, 10); if (name && !isNaN(price) && !isNaN(quantity) && quantity > 0) { const existing = Array.from(newProductsMap.values()).find(p => p.name === name && p.price === price); if (existing) { newProductsMap.set(existing.id, { ...existing, quantity: existing.quantity + quantity }); } else { const newId = generateUniqueId('item'); newProductsMap.set(newId, { id: newId, name, price, quantity }); } } }); dispatch({ type: 'RESET_SESSION' }); dispatch({ type: 'SET_PRODUCTS_FOR_REVIEW', payload: newProductsMap }); } else { throw new Error(result.error?.message || "No se pudo extraer información."); } } catch (error) { console.error("Error al analizar:", error); setImageProcessingError(error.message); } finally { setIsImageProcessing(false); } };
    const handleGenerateShareLink = async () => { if (!userId) { alert("La sesión no está lista."); return; } setIsGeneratingLink(true); const newShareId = `session_${Date.now()}`; justCreatedSessionId.current = newShareId; const dataToSave = { comensales, availableProducts: Object.fromEntries(availableProducts), activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])) }; try { await saveStateToGoogleSheets(newShareId, dataToSave); const fullLink = `${window.location.origin}${window.location.pathname}?id=${newShareId}`; dispatch({ type: 'SET_SHARE_ID', payload: newShareId }); dispatch({ type: 'SET_SHARE_LINK', payload: fullLink }); window.history.pushState({ path: fullLink }, '', fullLink); setTimeout(() => { if (justCreatedSessionId.current === newShareId) justCreatedSessionId.current = null; }, 10000); } catch (e) { alert(`Error al generar enlace: ${e.message}`); justCreatedSessionId.current = null; } finally { setIsGeneratingLink(false); } };
    const handleOpenSummaryModal = () => { const totalGeneralSinPropina = comensales.reduce((total, c) => total + c.selectedItems.reduce((sub, item) => sub + (item.originalBasePrice || 0) * item.quantity, 0), 0); const totalDescuentoCalculado = Math.min(totalGeneralSinPropina * (discountPercentage / 100), discountCap || Infinity); const data = comensales.map(comensal => { const totalSinPropina = comensal.selectedItems.reduce((sum, item) => sum + ((item.originalBasePrice || 0) * (item.quantity || 0)), 0); const propina = totalSinPropina * TIP_PERCENTAGE; const proporcionDelComensal = totalGeneralSinPropina > 0 ? totalSinPropina / totalGeneralSinPropina : 0; const descuentoAplicado = totalDescuentoCalculado * proporcionDelComensal; const totalConPropina = totalSinPropina + propina - descuentoAplicado; return { id: comensal.id, name: comensal.name, totalSinPropina: Math.round(totalSinPropina), propina: Math.round(propina), descuentoAplicado: Math.round(descuentoAplicado), totalConPropina: Math.round(totalConPropina) }; }); setSummaryData(data); setIsSummaryModalOpen(true); };
    const handlePrint = () => { const printContent = document.getElementById('print-source-content'); if (!printContent) return; const printWindow = window.open('', '_blank', 'height=800,width=800'); if (!printWindow) { alert('Permite las ventanas emergentes.'); return; } printWindow.document.write(`<html><head><title>Resumen</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-8">${printContent.innerHTML}</body></html>`); printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500); };

    const renderStep = () => {
        switch (currentStep) {
            case 'landing': return <LandingStep onStart={() => dispatch({ type: 'SET_STEP', payload: 'loading' })} />;
            // --- NUEVO CASO DE RENDERIZADO ---
            case 'loading_session': return <LoadingSessionStep />;
            case 'loading': return ( <LoadingStep onImageUpload={handleImageUpload} onManualEntry={() => dispatch({ type: 'SET_STEP', payload: 'reviewing' })} isImageProcessing={isImageProcessing} imageProcessingError={imageProcessingError} /> );
            case 'reviewing': return ( <ReviewStep initialProducts={availableProducts} onConfirm={(updatedProducts) => dispatch({ type: 'SET_PRODUCTS_AND_ADVANCE', payload: updatedProducts })} onBack={handleResetAll} discountPercentage={discountPercentage} discountCap={discountCap} dispatch={dispatch} /> );
            case 'assigning': return ( <AssigningStep availableProducts={availableProducts} comensales={comensales} newComensalName={newComensalName} setNewComensalName={setNewComensalName} addComensalMessage={addComensalMessage} onAddComensal={handleAddComensal} onAddItem={handleAddItem} onRemoveItem={handleRemoveItem} onOpenClearComensalModal={openClearComensalModal} onOpenRemoveComensalModal={openRemoveComensalModal} onOpenShareModal={() => setIsShareModalOpen(true)} onOpenSummary={handleOpenSummaryModal} onGoBack={() => dispatch({ type: 'SET_STEP', payload: 'reviewing' })} onGenerateLink={handleGenerateShareLink} onRestart={handleResetAll} shareLink={shareLink} discountPercentage={discountPercentage} discountCap={discountCap} /> );
            default: return <p>Cargando...</p>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <LoadingModal isOpen={isGeneratingLink} message="Generando enlace..." />
            <div className="max-w-4xl mx-auto p-4">{renderStep()}</div>
            <div style={{ display: 'none' }}>
                <div id="print-source-content">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Resumen de la Cuenta</h2>
                    <div className="space-y-6">
                        {summaryData.map(diner => (
                            <div key={diner.id} className="border-b border-dashed border-gray-300 pb-4 last:border-b-0" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">{diner.name}</h3>
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
const LandingStep = ({ onStart }) => ( <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4"> <div className="mb-8"> <svg className="w-24 h-24 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> </div> <h1 className="text-5xl font-extrabold text-gray-800">CuentasClaras</h1> <p className="text-lg text-gray-600 mt-4 max-w-md"> Divide la cuenta de forma fácil y rápida. Escanea el recibo y deja que nosotros hagamos el resto. </p> <button onClick={onStart} className="mt-12 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"> Empezar </button> </div> );
const LoadingStep = ({ onImageUpload, onManualEntry, isImageProcessing, imageProcessingError }) => ( <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4"> <header className="mb-12"> <h1 className="text-4xl font-extrabold text-blue-700 mb-2">Cargar la Cuenta</h1> <p className="text-lg text-gray-600">¿Cómo quieres ingresar los ítems?</p> </header> <div className="w-full max-w-sm space-y-5"> <label htmlFor="file-upload" className={`w-full flex flex-col items-center px-6 py-8 bg-blue-600 text-white rounded-xl shadow-lg tracking-wide uppercase border border-blue-600 cursor-pointer hover:bg-blue-700 transition-all ${isImageProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}> <svg className="w-12 h-12 mb-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"> <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" /> </svg> <span className="text-lg font-semibold">Escanear Recibo</span> <span className="text-sm">Carga una foto</span> <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={onImageUpload} disabled={isImageProcessing} /> </label> <button onClick={onManualEntry} disabled={isImageProcessing} className="w-full px-6 py-5 bg-white text-blue-600 font-semibold rounded-xl shadow-lg border border-gray-200 hover:bg-gray-100 transition-all disabled:opacity-50"> Ingresar Manualmente </button> </div> {isImageProcessing && ( <div className="mt-6 text-blue-600 font-semibold flex items-center justify-center"> <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <span>Procesando...</span> </div> )} {imageProcessingError && <p className="mt-4 text-red-600">Error: {imageProcessingError}</p>} </div> );

const ReviewStep = ({ initialProducts, onConfirm, onBack, discountPercentage, discountCap, dispatch }) => {
    const [localProducts, setLocalProducts] = useState(() => new Map(initialProducts));
    const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' });

    useEffect(() => { setLocalProducts(new Map(initialProducts)); }, [initialProducts]);
    
    const total = Array.from(localProducts.values()).reduce((sum, p) => (sum + (parseFloat(p.price) || 0) * (parseInt(p.quantity, 10) || 0)), 0);
    const potentialDiscount = total * (discountPercentage / 100);
    const actualDiscount = (discountPercentage > 0 && discountCap > 0) ? Math.min(potentialDiscount, discountCap) : (discountPercentage > 0 ? potentialDiscount : 0);
    const tip = total * TIP_PERCENTAGE;
    const grandTotal = total + tip - actualDiscount;

    const handleProductChange = (id, field, value) => { setLocalProducts(prev => { const newMap = new Map(prev); const product = newMap.get(id); if (product) newMap.set(id, { ...product, [field]: value }); return newMap; }); };
    const handleRemoveProduct = (id) => { setLocalProducts(prev => { const newMap = new Map(prev); newMap.delete(id); return newMap; }); };
    
    const handleAddNewItem = () => {
        if (!newItem.name.trim()) { alert('Por favor, ingresa un nombre válido.'); return; }
        const price = parseFloat(newItem.price); const quantity = parseInt(newItem.quantity, 10);
        if (isNaN(price) || price <= 0) { alert('El precio debe ser un número positivo.'); return; }
        if (isNaN(quantity) || quantity <= 0) { alert('La cantidad debe ser un número entero positivo.'); return; }
        setLocalProducts(prev => {
            const newMap = new Map(prev);
            const newId = generateUniqueId('item');
            newMap.set(newId, { id: newId, name: newItem.name.trim(), price: price, quantity: quantity });
            return newMap;
        });
        setNewItem({ name: '', price: '', quantity: '1' });
    };
    
    const handleDiscountChange = (e) => {
        const { name, value } = e.target;
        const newPercentage = name === 'percentage' ? value : discountPercentage;
        const newCap = name === 'cap' ? value : discountCap;
        dispatch({ type: 'APPLY_DISCOUNT', payload: { percentage: newPercentage, cap: newCap }});
    };
    
    return (
        <div className="p-4 pb-20">
            <header className="text-center mb-6"> <h1 className="text-3xl font-extrabold text-blue-700">Revisa y Ajusta la Cuenta</h1> <p className="text-gray-600">Asegúrate que los ítems y precios coincidan con tu recibo.</p> </header>
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 space-y-3">
                <h2 className="text-lg font-bold">Ítems Cargados</h2>
                {Array.from(localProducts.values()).map(p => (
                    <div key={p.id} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
                        <input type="text" value={p.name} onChange={e => handleProductChange(p.id, 'name', e.target.value)} className="col-span-5 p-2 border rounded-md" aria-label="Nombre"/>
                        <input type="number" value={p.quantity} onChange={e => handleProductChange(p.id, 'quantity', e.target.value)} className="col-span-2 p-2 border rounded-md text-center" aria-label="Cantidad" min="1"/>
                        <span className="col-span-1 text-center self-center">$</span>
                        <input type="number" value={p.price} onChange={e => handleProductChange(p.id, 'price', e.target.value)} className="col-span-3 p-2 border rounded-md" aria-label="Precio" min="0"/>
                        <button onClick={() => handleRemoveProduct(p.id)} className="col-span-1 text-red-500 hover:text-red-700" aria-label={`Eliminar ${p.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg> </button>
                    </div>
                ))}
                <div className="grid grid-cols-12 gap-2 items-center pt-3">
                    <input type="text" placeholder="Nombre ítem" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="col-span-5 p-2 border rounded-md" aria-label="Nombre nuevo ítem"/>
                    <input type="number" placeholder="Cant." value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="col-span-2 p-2 border rounded-md text-center" aria-label="Cantidad nuevo ítem" min="1"/>
                    <span className="col-span-1 text-center self-center">$</span>
                    <input type="number" placeholder="Precio" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="col-span-3 p-2 border rounded-md" aria-label="Precio nuevo ítem" min="0"/>
                    <button onClick={handleAddNewItem} className="col-span-1 text-white bg-green-500 hover:bg-green-600 rounded-full p-1 h-8 w-8 flex items-center justify-center" aria-label="Agregar ítem"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg> </button>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                <h2 className="text-lg font-bold text-blue-600 mb-4">Aplicar Descuento</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input type="number" name="percentage" placeholder="% de Descuento" value={discountPercentage || ''} onChange={handleDiscountChange} className="flex-grow p-3 border rounded-md" min="0" max="100" aria-label="Porcentaje descuento"/>
                    <input type="number" name="cap" placeholder="Tope de Descuento ($)" value={discountCap || ''} onChange={handleDiscountChange} className="flex-grow p-3 border rounded-md" min="0" aria-label="Tope descuento"/>
                </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl shadow-inner mb-6">
                <div className="flex justify-between text-lg"><span className="font-semibold text-gray-700">Subtotal:</span><span className="font-bold">${Math.round(total).toLocaleString('es-CL')}</span></div>
                {actualDiscount > 0 && (<div className="flex justify-between text-lg"><span className="font-semibold text-gray-700">Descuento ({discountPercentage}%):</span><span className="font-bold text-green-600">-${Math.round(actualDiscount).toLocaleString('es-CL')}</span></div>)}
                <div className="flex justify-between text-lg"><span className="font-semibold text-gray-700">Propina ({TIP_PERCENTAGE*100}%):</span><span className="font-bold">${Math.round(tip).toLocaleString('es-CL')}</span></div>
                <div className="flex justify-between text-2xl font-extrabold text-blue-800 mt-2 pt-2 border-t border-blue-200"><span>TOTAL:</span><span>${Math.round(grandTotal).toLocaleString('es-CL')}</span></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={onBack} className="w-full py-3 px-5 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300">Empezar de Nuevo</button>
                <button onClick={() => onConfirm(localProducts)} className="w-full py-3 px-5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Todo Correcto, Continuar</button>
            </div>
        </div>
    );
};

const AssigningStep = ({
    availableProducts, comensales, newComensalName, setNewComensalName, addComensalMessage, onAddComensal,
    onAddItem, onRemoveItem, onOpenClearComensalModal, onOpenRemoveComensalModal, onOpenShareModal, onOpenSummary,
    onGoBack, onGenerateLink, onRestart, shareLink, discountPercentage, discountCap
}) => {
    const remainingToAssign = Array.from(availableProducts.values()).reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
    const totalGeneralSinPropina = comensales.reduce((total, c) => total + c.selectedItems.reduce((sub, item) => sub + (item.originalBasePrice || 0) * item.quantity, 0), 0);
    const totalDescuentoCalculado = Math.min(totalGeneralSinPropina * (discountPercentage / 100), discountCap || Infinity);

    const ComensalCard = ({ comensal }) => {
        const totalSinPropina = comensal.selectedItems.reduce((sum, item) => sum + ((item.originalBasePrice || 0) * item.quantity), 0);
        const propina = totalSinPropina * TIP_PERCENTAGE;
        const proporcionDelComensal = totalGeneralSinPropina > 0 ? totalSinPropina / totalGeneralSinPropina : 0;
        const descuentoAplicado = totalDescuentoCalculado * proporcionDelComensal;
        const totalAPagar = totalSinPropina + propina - descuentoAplicado;

        return (
            <div className="bg-white p-5 rounded-xl shadow-lg flex flex-col h-full">
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
                    <div className="flex justify-between text-sm text-gray-600"><span>Propina ({TIP_PERCENTAGE*100}%):</span><span>${Math.round(propina).toLocaleString('es-CL')}</span></div>
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
            <header className="mb-6 text-center"> <h1 className="text-3xl font-extrabold text-blue-700 mb-2">Asignar Consumos</h1> <p className="text-gray-600">Agrega comensales y asígnales lo que consumieron.</p> <button onClick={onGoBack} className="mt-2 text-sm text-blue-600 hover:underline">&larr; Volver y Editar Ítems</button> </header>
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-xl font-bold text-blue-600 mb-4">Agregar Nuevo Comensal</h2>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input type="text" placeholder="Nombre del Comensal" value={newComensalName} onChange={(e) => setNewComensalName(e.target.value)} className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full" />
                    <button onClick={onAddComensal} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 w-full sm:w-auto">Añadir</button>
                </div>
                {addComensalMessage.text && (<p className={`mt-3 text-center text-sm ${addComensalMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{addComensalMessage.text}</p>)}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-xl font-bold text-blue-600 mb-4 text-center">Herramientas</h2>
                <div className="space-y-3">
                    <button onClick={onGenerateLink} className="w-full flex items-center justify-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> <span className="font-semibold">Generar Link de Sesión</span> </button>
                    <button onClick={onOpenShareModal} className="w-full flex items-center justify-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg> <span className="font-semibold">Compartir un Ítem</span> </button>
                    <button onClick={onRestart} className="w-full flex items-center justify-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5" /><path d="M4 9a9 9 0 0114.65-4.65l-2.12 2.12a5 5 0 00-9.07 4.53" /><path d="M20 15a9 9 0 01-14.65 4.65l2.12-2.12a5 5 0 009.07-4.53" /></svg> <span className="font-semibold">Empezar de Nuevo</span> </button>
                </div>
                {shareLink && ( <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200"> <p className="font-semibold text-green-800">¡Enlace para compartir generado!</p> <input type="text" readOnly value={shareLink} className="w-full mt-2 p-2 border rounded-md bg-white text-center text-sm" onFocus={(e) => e.target.select()} /> <button onClick={() => navigator.clipboard.writeText(shareLink).then(() => alert('¡Enlace copiado!'))} className="mt-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700">Copiar Enlace</button> </div> )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comensales.map(comensal => ( <ComensalCard key={comensal.id} comensal={comensal} /> ))}
            </div>
            {comensales.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200">
                    <button onClick={onOpenSummary} className="w-full max-w-4xl mx-auto py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-transform hover:scale-105 flex flex-col items-center">
                        <span className="text-lg">Ver Resumen Final</span>
                        {Math.round(remainingToAssign) > 0 && ( <span className="text-xs font-normal opacity-90"> Faltan ${Math.round(remainingToAssign).toLocaleString('es-CL')} por asignar </span> )}
                    </button>
                </div>
            )}
        </div>
    )
};

export default App;
