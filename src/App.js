import React, { useState, useEffect, useCallback, useRef } from 'react';

// Polyfill para 'process' si no está definido (por ejemplo, en algunos entornos de cliente)
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {} };
}

// URL de tu Google Apps Script Web App
// ¡IMPORTANTE! Reemplaza esto con la URL de tu nueva implementación de Apps Script.
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzI_sW6-SKJy8K3M1apb_hdmafjE9gz8ZF7UPrYKfeI5eBGDKmqagl6HLxnB0ILeY67JA/exec"; 

// Este appId ya no es de Firebase, es solo un identificador para tus datos si lo necesitas.
const canvasAppId = 'default-bill-splitter-app'; 


// Componente para el modal de confirmación personalizado
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, confirmText, cancelText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmar Acción</h2>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {cancelText || 'Cancelar'}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};


// Componente para el modal de compartir ítems
const ShareItemModal = ({ isOpen, onClose, availableProducts, comensales, onShareConfirm }) => {
  const [selectedProductToShare, setSelectedProductToShare] = useState('');
  const [selectedComensalesForShare, setSelectedComensalesForShare] = useState([]);
  const [isShareWarningModalOpen, setIsShareWarningModalOpen] = useState(false);
  const [tempShareProductId, setTempShareProductId] = useState(null);
  const [tempSharingComensalIds, setTempSharingComensalIds] = useState([]);


  // Reinicia el estado cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      setSelectedProductToShare('');
      setSelectedComensalesForShare([]);
    }
  }, [isOpen]);

  // Maneja la selección/deselección de comensales para compartir
  const handleComensalToggle = (comensalId) => {
    setSelectedComensalesForShare(prev =>
      prev.includes(comensalId)
        ? prev.filter(id => id !== comensalId)
        : [...prev, comensalId]
    );
  };

  // Confirma la acción de compartir
  const handleConfirm = () => {
    if (!selectedProductToShare || selectedComensalesForShare.length === 0) {
      alert('Por favor, selecciona un producto y al menos un comensal para compartir.');
      return;
    }

    if (selectedComensalesForShare.length === 1) {
        setTempShareProductId(parseInt(selectedProductToShare));
        setTempSharingComensalIds(selectedComensalesForShare);
        setIsShareWarningModalOpen(true);
    } else {
        onShareConfirm(parseInt(selectedProductToShare), selectedComensalesForShare);
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Compartir Ítem</h2>
        <div className="mb-4">
          <label htmlFor="share-product-select" className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona Ítem a Compartir:
          </label>
          <select
            id="share-product-select"
            value={selectedProductToShare}
            onChange={(e) => setSelectedProductToShare(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
          >
            <option value="" disabled>Selecciona un producto</option>
            {sharableProducts.map(product => (
              <option key={String(product.id)} value={product.id}>
                {product.name} (${Number(product.price).toLocaleString('es-CL')}) (Disp: {Number(product.quantity)})
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona Comensales para Compartir:
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-3 rounded-md bg-gray-50">
            {comensales.map(comensal => (
              <div key={String(comensal.id)} className="flex items-center">
                <input
                  type="checkbox"
                  id={`comensal-share-${comensal.id}`}
                  checked={selectedComensalesForShare.includes(comensal.id)}
                  onChange={() => handleComensalToggle(comensal.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`comensal-share-${comensal.id}`} className="ml-2 text-sm text-gray-900">
                  {comensal.name}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Confirmar Compartir
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

const App = () => {
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [shareId, setShareId] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [availableProducts, setAvailableProducts] = useState(new Map());
  const [totalGeneralMesa, setTotalGeneralMesa] = useState(0); 
  const [propinaSugerida, setPropinaSugerida] = useState(0); 
  const [comensales, setComensales] = useState([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newComensalName, setNewComensalName] = useState(''); 
  const [addComensalMessage, setAddComensalMessage] = useState({ type: '', text: '' }); 
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  const [manualItemQuantity, setManualItemQuantity] = useState('');
  const [manualItemMessage, setManualItemMessage] = useState({ type: '', text: '' });
  const [itemToRemoveFromInventoryId, setItemToRemoveFromInventoryId] = useState('');
  const [isRemoveInventoryItemModalOpen, setIsRemoveInventoryItemModalOpen] = useState(false);
  const [removeInventoryItemMessage, setRemoveInventoryItemMessage] = useState({ type: '', text: '' });
  const [isClearComensalModalOpen, setIsClearComensalModalOpen] = useState(false);
  const [comensalToClearId, setComensalToClearId] = useState(null);
  const [isRemoveComensalModalOpen, setIsRemoveComensalModalOpen] = useState(false);
  const [comensalToRemoveId, setComensalToRemoveId] = useState(null);
  const [isClearAllComensalesModalOpen, setIsClearAllComensalesModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false); 
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageProcessingError, setImageProcessingError] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [activeSharedInstances, setActiveSharedInstances] = useState(new Map());
  const hasPendingChanges = useRef(false);
  const totalBillWithReceiptTip = totalGeneralMesa + propinaSugerida;
  const MAX_COMENSALES = 20;

  // =================================================================================
  // === INICIO DE FUNCIONES JSONP ===
  // =================================================================================
  const saveStateToGoogleSheets = useCallback(async (currentShareId, dataToSave) => {
    if (GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
      console.error("Error: GOOGLE_SHEET_WEB_APP_URL no está configurada o es inválida.");
      alert("Error de configuración: la URL de Google Apps Script no es válida.");
      return Promise.reject(new Error("URL inválida"));
    }
    if (!currentShareId || !userId) return Promise.resolve();

    const callbackName = 'jsonp_callback_save_' + Math.round(100000 * Math.random());
    const promise = new Promise((resolve, reject) => {
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      const script = document.createElement('script');
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('Error al guardar los datos en Google Sheets.'));
      };

      const dataString = JSON.stringify(dataToSave);
      const encodedData = encodeURIComponent(dataString);
      script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=save&id=${currentShareId}&data=${encodedData}&callback=${callbackName}`;
      
      document.body.appendChild(script);
    });

    try {
      const result = await promise;
      if (result.status === 'error') {
        console.error("Error al guardar en Google Sheets (JSONP):", result.message);
        alert("Error al guardar en Google Sheets: " + result.message);
        return Promise.reject(new Error(result.message));
      } else {
        console.log("Guardado exitoso en Google Sheets (JSONP):", result.message);
        return Promise.resolve();
      }
    } catch (error) {
      console.error("Error de red al guardar en Google Sheets (JSONP):", error);
      alert("Error de red al guardar en Google Sheets. Consulta la consola para más detalles.");
      return Promise.reject(error);
    }
  }, [userId]);

  const loadStateFromGoogleSheets = useCallback(async (idToLoad) => {
    if (GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
      console.error("Error: GOOGLE_SHEET_WEB_APP_URL no está configurada o es inválida.");
      alert("Error de configuración: la URL de Google Apps Script no es válida.");
      return;
    }
    if (!idToLoad) return;

    if (hasPendingChanges.current) {
        console.log("Sondeo pausado: hay cambios locales pendientes de guardar.");
        return;
    }

    const callbackName = 'jsonp_callback_load_' + Math.round(100000 * Math.random());
    const promise = new Promise((resolve, reject) => {
        window[callbackName] = (data) => {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };

        const script = document.createElement('script');
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('Error al cargar los datos desde Google Sheets.'));
        };
        
        script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=load&id=${idToLoad}&callback=${callbackName}`;
        document.body.appendChild(script);
    });

    try {
        const data = await promise;
        if (data && data.status !== "not_found") {
            if (hasPendingChanges.current) {
                console.log("Datos recibidos del sondeo, pero ignorados debido a cambios locales pendientes.");
                return;
            }
            console.log("Datos cargados con JSONP:", data);
            setComensales(data.comensales || []);
            setAvailableProducts(new Map(Object.entries(data.availableProducts || {})));
            setTotalGeneralMesa(data.totalGeneralMesa || 0);
            setPropinaSugerida(data.propinaSugerida || 0);
            setActiveSharedInstances(new Map(Object.entries(data.activeSharedInstances || {}).map(([key, value]) => [key, new Set(value)])));
        } else {
            console.log("No se encontraron datos para el ID con JSONP:", idToLoad);
            setComensales([]);
            setAvailableProducts(new Map());
            setTotalGeneralMesa(0);
            setPropinaSugerida(0);
            setActiveSharedInstances(new Map());
            const url = new URL(window.location.href);
            url.searchParams.delete('id');
            window.history.replaceState({}, document.title, url.toString());
            setShareId(null);
        }
    } catch (error) {
        console.error("Error al cargar con JSONP:", error);
        alert("Error de red al cargar los datos. Revisa la consola.");
        setComensales([]);
        setAvailableProducts(new Map());
        setTotalGeneralMesa(0);
        setPropinaSugerida(0);
        setActiveSharedInstances(new Map());
    }
  }, []);

  const deleteStateFromGoogleSheets = useCallback(async (idToDelete) => {
    if (GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
      console.error("Error: GOOGLE_SHEET_WEB_APP_URL no está configurada o es inválida.");
      alert("Error de configuración: la URL de Google Apps Script no es válida.");
      return;
    }
    if (!idToDelete) return;

    const callbackName = 'jsonp_callback_delete_' + Math.round(100000 * Math.random());
    const promise = new Promise((resolve, reject) => {
        window[callbackName] = (data) => {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        const script = document.createElement('script');
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('Error al eliminar los datos de Google Sheets.'));
        };

        script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=delete&id=${idToDelete}&callback=${callbackName}`;
        document.body.appendChild(script);
    });

    try {
        const result = await promise;
        if (result.status === 'error') {
            console.error("Error al eliminar de Google Sheets (JSONP):", result.message);
            alert("Error al eliminar de Google Sheets: " + result.message);
        } else {
            console.log("Eliminación exitosa en Google Sheets (JSONP):", result.message);
        }
    } catch (error) {
        console.error("Error de red al eliminar de Google Sheets (JSONP):", error);
        alert("Error de red al eliminar los datos. Revisa la consola.");
    }
  }, []);
  // =================================================================================
  // === FIN DE FUNCIONES JSONP ===
  // =================================================================================


  useEffect(() => {
    const uniqueSessionUserId = localStorage.getItem('billSplitterUserId');
    if (uniqueSessionUserId) {
      setUserId(uniqueSessionUserId);
    } else {
      const newUniqueId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('billSplitterUserId', newUniqueId);
      setUserId(newUniqueId);
    }
    setAuthReady(true); 
  }, []);

  useEffect(() => {
    if (!authReady || !userId) return; 

    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    if (idFromUrl) {
      setShareId(idFromUrl);
      loadStateFromGoogleSheets(idFromUrl);
    } else {
      const newSessionId = `${userId}-${Date.now()}`;
      setShareId(newSessionId);
    }
  }, [authReady, userId, loadStateFromGoogleSheets]);

  useEffect(() => {
    if (!shareId || !userId || GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) return; 

    const pollingInterval = setInterval(() => {
      loadStateFromGoogleSheets(shareId);
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [shareId, userId, loadStateFromGoogleSheets]);

  useEffect(() => {
    if (!shareId || !authReady || isImageProcessing) return;

    hasPendingChanges.current = true;

    const handler = setTimeout(() => {
      const dataToSave = {
          comensales: comensales,
          availableProducts: Object.fromEntries(availableProducts),
          totalGeneralMesa: totalGeneralMesa,
          propinaSugerida: propinaSugerida,
          activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])),
          lastUpdated: new Date().toISOString()
      };
      
      saveStateToGoogleSheets(shareId, dataToSave)
        .then(() => {
          hasPendingChanges.current = false;
        })
        .catch(() => {
          console.log("El guardado falló. Los cambios siguen marcados como pendientes.");
        });

    }, 1000);

    return () => clearTimeout(handler);

  }, [comensales, availableProducts, totalGeneralMesa, propinaSugerida, activeSharedInstances, shareId, saveStateToGoogleSheets, authReady, isImageProcessing]);


  useEffect(() => {
    const baseTotal = Array.from(availableProducts.values()).reduce((sum, product) => {
      return sum + (Number(product.price) * Number(product.quantity));
    }, 0);
    setTotalGeneralMesa(baseTotal);
    setPropinaSugerida(baseTotal * 0.10);
  }, [availableProducts]);

  
  // ==================================================================
  // === INICIO DE LAS FUNCIONES DE MANEJO DE ESTADO REFACTORIZADAS ===
  // ==================================================================

  // === FUNCIÓN CORREGIDA ===
  // Sigue el patrón "Leer, Calcular, Escribir" y elimina la forma de objeto inconsistente.
  const handleAddItem = (comensalId, productId) => {
    // 1. Leer estado y validar
    const productInStock = availableProducts.get(productId);
    if (!productInStock || Number(productInStock.quantity) <= 0) {
      return;
    }

    // 2. Calcular nuevos estados
    const newProductsMap = new Map(availableProducts);
    const updatedProduct = { ...productInStock, quantity: Number(productInStock.quantity) - 1 };
    newProductsMap.set(productId, updatedProduct);

    const newComensales = comensales.map(comensal => {
      if (comensal.id === comensalId) {
        const updatedComensal = { ...comensal, selectedItems: [...comensal.selectedItems] };
        const priceWithTip = Number(productInStock.price) * 1.10;
        
        const existingItemIndex = updatedComensal.selectedItems.findIndex(item => item.id === productId && item.type === 'full');

        if (existingItemIndex !== -1) {
          updatedComensal.selectedItems[existingItemIndex].quantity += 1;
        } else {
          updatedComensal.selectedItems.push({
            ...productInStock,
            price: priceWithTip,
            originalBasePrice: Number(productInStock.price),
            quantity: 1,
            type: 'full',
          });
        }
        
        updatedComensal.total = updatedComensal.selectedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        return updatedComensal;
      }
      return comensal;
    });

    // 3. Escribir (actualizar) los estados
    setAvailableProducts(newProductsMap);
    setComensales(newComensales);
  };

  const handleRemoveItem = (comensalId, itemToRemoveIdentifier) => {
    const comensalTarget = comensales.find(c => c.id === comensalId);
    if (!comensalTarget) return;

    const itemIndex = comensalTarget.selectedItems.findIndex(item =>
      (item.type === 'shared' && String(item.shareInstanceId) === String(itemToRemoveIdentifier)) ||
      (item.type === 'full' && item.id === Number(itemToRemoveIdentifier))
    );

    if (itemIndex === -1) return;

    const itemToRemove = { ...comensalTarget.selectedItems[itemIndex] };

    // --- Lógica para Ítems Individuales ('full') ---
    if (itemToRemove.type === 'full') {
      const newComensales = comensales.map(c => {
        if (c.id === comensalId) {
          const updatedItems = [...c.selectedItems];
          const itemInBill = updatedItems[itemIndex];

          if (itemInBill.quantity > 1) {
            itemInBill.quantity -= 1;
          } else {
            updatedItems.splice(itemIndex, 1);
          }
          const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          return { ...c, selectedItems: updatedItems, total: newTotal };
        }
        return c;
      });
      setComensales(newComensales);

      setAvailableProducts(currentProducts => {
        const newProducts = new Map(currentProducts);
        const product = newProducts.get(itemToRemove.id);
        if (product) {
          newProducts.set(itemToRemove.id, { ...product, quantity: product.quantity + 1 });
        }
        return newProducts;
      });
      return;
    }

    // --- Lógica para Ítems Compartidos ('shared') ---
    if (itemToRemove.type === 'shared') {
      const { shareInstanceId, id: originalProductId } = itemToRemove;
      
      const totalItemBasePrice = itemToRemove.originalBasePrice * itemToRemove.sharedByCount;

      const newActiveSharedInstances = new Map(activeSharedInstances);
      const shareGroup = newActiveSharedInstances.get(shareInstanceId);
      
      if (!shareGroup) return; 

      shareGroup.delete(comensalId);

      // Si el grupo de compartido queda vacío
      if (shareGroup.size === 0) {
        newActiveSharedInstances.delete(shareInstanceId);
        
        setAvailableProducts(currentProducts => {
          const newProducts = new Map(currentProducts);
          const product = newProducts.get(originalProductId);
          if (product) {
            newProducts.set(originalProductId, { ...product, quantity: product.quantity + 1 });
          }
          return newProducts;
        });
        
        const finalComensales = comensales.map(c => {
          if (c.id === comensalId) {
            const newSelectedItems = c.selectedItems.filter(i => String(i.shareInstanceId) !== String(shareInstanceId));
            const newTotal = newSelectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return { ...c, selectedItems: newSelectedItems, total: newTotal };
          }
          return c;
        });
        setComensales(finalComensales);

      } else { // Si aún quedan comensales, redistribuir el costo
        const newSharerCount = shareGroup.size;
        const newBasePricePerShare = totalItemBasePrice / newSharerCount;
        const newPriceWithTipPerShare = newBasePricePerShare * 1.10;

        const finalComensales = comensales.map(c => {
          if (c.id === comensalId) {
            const newSelectedItems = c.selectedItems.filter(i => String(i.shareInstanceId) !== String(shareInstanceId));
            const newTotal = newSelectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return { ...c, selectedItems: newSelectedItems, total: newTotal };
          }
          if (shareGroup.has(c.id)) {
            const newSelectedItems = c.selectedItems.map(item => {
              if (String(item.shareInstanceId) === String(shareInstanceId)) {
                return {
                  ...item,
                  price: newPriceWithTipPerShare,
                  originalBasePrice: newBasePricePerShare,
                  sharedByCount: newSharerCount,
                };
              }
              return item;
            });
            const newTotal = newSelectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return { ...c, selectedItems: newSelectedItems, total: newTotal };
          }
          return c;
        });
        setComensales(finalComensales);
      }
      
      setActiveSharedInstances(newActiveSharedInstances);
    }
  };

  const handleShareItem = (productId, sharingComensalIds) => {
    const productToShare = availableProducts.get(productId);
    if (!productToShare || Number(productToShare.quantity) <= 0) {
      alert('Producto no disponible para compartir.');
      return;
    }

    const newProductsMap = new Map(availableProducts);
    newProductsMap.set(productId, { ...productToShare, quantity: Number(productToShare.quantity) - 1 });

    const shareInstanceId = Date.now() + Math.random();
    const newActiveSharedInstances = new Map(activeSharedInstances);
    newActiveSharedInstances.set(shareInstanceId, new Set(sharingComensalIds));
    
    const basePricePerShare = Number(productToShare.price) / Number(sharingComensalIds.length);
    const priceWithTipPerShare = basePricePerShare * 1.10;

    const newComensales = comensales.map(comensal => {
      if (sharingComensalIds.includes(comensal.id)) {
        const updatedItems = [
          ...comensal.selectedItems,
          {
            id: productToShare.id,
            name: productToShare.name,
            price: priceWithTipPerShare,
            originalBasePrice: basePricePerShare,
            quantity: 1,
            type: 'shared',
            sharedByCount: Number(sharingComensalIds.length),
            shareInstanceId: shareInstanceId
          }
        ];
        const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        return { ...comensal, selectedItems: updatedItems, total: newTotal };
      }
      return comensal;
    });

    setAvailableProducts(newProductsMap);
    setActiveSharedInstances(newActiveSharedInstances);
    setComensales(newComensales);
  };
  
  // === FUNCIÓN CORREGIDA ===
  // Crea un objeto comensal consistente (sin propiedades extra).
  const handleAddComensal = () => {
    if (newComensalName.trim() === '') {
      setAddComensalMessage({ type: 'error', text: 'Por favor, ingresa un nombre para el nuevo comensal.' });
      return;
    }
    if (comensales.length >= MAX_COMENSALES) {
      setAddComensalMessage({ type: 'error', text: `No se pueden agregar más de ${MAX_COMENSALES} comensales.` });
      return;
    }

    const newComensalId = comensales.length > 0 ? Math.max(...comensales.map(c => Number(c.id))) + 1 : 1;
    const newComensal = {
      id: newComensalId,
      name: newComensalName.trim(),
      selectedItems: [],
      total: 0,
    };

    setComensales(prevComensales => [...prevComensales, newComensal]);
    setNewComensalName('');
    setAddComensalMessage({ type: 'success', text: `¡Comensal "${newComensal.name}" añadido con éxito!` });
    setTimeout(() => setAddComensalMessage({ type: '', text: '' }), 3000);
  };
  
  // === FUNCIÓN CORREGIDA ===
  // Unifica la lógica de borrado para reusar `handleRemoveItem`.
  const confirmClearComensal = () => {
    setIsClearComensalModalOpen(false);
    const comensalToClear = comensales.find(c => c.id === comensalToClearId);

    if (comensalToClear) {
      // Usamos un bucle `while` porque la longitud del array cambia en cada iteración
      while (comensalToClear.selectedItems.length > 0) {
        const item = comensalToClear.selectedItems[0];
        const identifier = item.type === 'shared' ? item.shareInstanceId : item.id;
        // Llamamos a la función robusta que ya tenemos
        handleRemoveItem(comensalToClear.id, identifier);
        // Actualizamos nuestra referencia local al comensal para la siguiente iteración del bucle
        const updatedComensal = comensales.find(c => c.id === comensalToClearId);
        if (updatedComensal) {
          comensalToClear.selectedItems = updatedComensal.selectedItems;
        } else {
          break; 
        }
      }
    }
    setComensalToClearId(null);
  };

  // ==================================================================
  // === FIN DE LAS FUNCIONES DE MANEJO DE ESTADO REFACTORIZADAS ===
  // ==================================================================

  const openClearComensalModal = (comensalId) => {
    setComensalToClearId(comensalId);
    setIsClearComensalModalOpen(true);
  };

  const confirmRemoveComensal = () => {
    setIsRemoveComensalModalOpen(false);
    const comensalToRemove = comensales.find(c => c.id === comensalToRemoveId);

    if (comensalToRemove) {
      // Primero, limpiar todos sus ítems usando la misma lógica robusta
      while (comensalToRemove.selectedItems.length > 0) {
          const item = comensalToRemove.selectedItems[0];
          const identifier = item.type === 'shared' ? item.shareInstanceId : item.id;
          handleRemoveItem(comensalToRemove.id, identifier);
          const updatedComensal = comensales.find(c => c.id === comensalToRemoveId);
          if (updatedComensal) {
              comensalToRemove.selectedItems = updatedComensal.selectedItems;
          } else {
              break;
          }
      }
      // Finalmente, eliminar al comensal del array
      setComensales(prevComensales => prevComensales.filter(c => c.id !== comensalToRemoveId));
    }
    setComensalToRemoveId(null);
  };

  const openRemoveComensalModal = (comensalId) => {
    setComensalToRemoveId(comensalId);
    setIsRemoveComensalModalOpen(true);
  };

  const confirmClearAllComensales = () => {
    setIsClearAllComensalesModalOpen(false);

    let currentComensales = [...comensales];
    currentComensales.forEach(comensal => {
      while (comensal.selectedItems.length > 0) {
        const item = comensal.selectedItems[0];
        const identifier = item.type === 'shared' ? item.shareInstanceId : item.id;
        handleRemoveItem(comensal.id, identifier);
        // Actualizar la referencia para la siguiente iteración
        const updatedComensal = comensales.find(c => c.id === comensal.id);
        if (updatedComensal) {
          comensal.selectedItems = updatedComensal.selectedItems;
        } else {
          break; 
        }
      }
    });
    setComensales([]);
  };

  const openClearAllComensalesModal = () => {
    setIsClearAllComensalesModalOpen(true);
  };

  // Resto del código (sin cambios)...

  // NEW: Image Upload & Analysis Functions
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedImageUrl(URL.createObjectURL(file)); // For displaying the preview
      setIsImageProcessing(true);
      setImageProcessingError(null);

      // CORRECCIÓN: NO se resetea el estado aquí. Se hará después de la respuesta de la IA.
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result.split(',')[1]; // Get base64 data
        analyzeImageWithGemini(base64Image, file.type); // Pass file type
      };
      reader.onerror = () => {
        setImageProcessingError("Error al cargar la imagen.");
        setIsImageProcessing(false);
        setUploadedImageUrl(null); // Hide image on error
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithGemini = async (base64ImageData, mimeType) => {
    try {
        const prompt = `Analiza la imagen de recibo adjunta.
        Extrae todos los ítems individuales de comida y bebida, sus cantidades y sus precios base.
        También, si encuentras, extrae el "Total General Mesa" (precio sin propina/impuestos) y la "Propina Sugerida" (si es un valor explícito de propina, no un total con propina).

        Proporciona la salida como un objeto JSON con las siguientes propiedades:
        - items: (array de objetos) Lista de ítems. Cada objeto debe tener:
            - name: (string) El nombre del ítem.
            - quantity: (integer) El número de unidades de este ítem.
            - price: (number) El precio base numérico de una sola unidad de este ítem. Usa un punto para los decimales si los hay, y no uses separadores de miles.
        - totalGeneralMesa: (number, opcional) El valor numérico del total general de la mesa (sin propina), si lo encuentras.
        - propinaSugerida: (number, opcional) El valor numérico de la propina sugerida, si lo encuentras.

        Ejemplo de formato JSON:
        {
          "items": [
            {
              "name": "Heineken 500cc",
              "quantity": 4,
              "price": 4990
            },
            {
              "name": "Mechada Italiana",
              "quantity": 5,
              "price": 11990
            }
          ],
          "totalGeneralMesa": 234440,
          "propinaSugerida": 23444
        }
        `;

        let chatHistory = [];
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64ImageData
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "items": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "name": { "type": "STRING" },
                                    "quantity": { "type": "INTEGER" },
                                    "price": { "type": "NUMBER" }
                                },
                                "propertyOrdering": ["name", "quantity", "price"]
                            }
                        },
                        "totalGeneralMesa": { "type": "NUMBER" },
                        "propinaSugerida": { "type": "NUMBER" }
                    },
                    "propertyOrdering": ["items", "totalGeneralMesa", "propinaSugerida"]
                }
            }
        };

        const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyDMhW9Fxz2kLG7HszVnBDmgQMJwzXSzd9U"; // Read from environment variable

        if (apiKey === "TU_CLAVE_DE_API_DE_GEMINI_AQUI" || apiKey.trim() === "") {
          setImageProcessingError("Error: Falta la clave de API de Gemini. Por favor, edita el código e inserta tu clave.");
          setIsImageProcessing(false);
          setUploadedImageUrl(null);
          return;
        }


        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const json = result.candidates[0].content.parts[0].text;
            const parsedData = JSON.parse(json); 

            // CORRECCIÓN: El estado se resetea aquí, justo antes de poblarlo con los nuevos datos.
            setComensales([]); 
            setTotalGeneralMesa(0);
            setPropinaSugerida(0); 
            setActiveSharedInstances(new Map());

            const newProductsMap = new Map();
            let currentMaxId = 0;

            (parsedData.items || []).forEach(item => {
                const name = item.name.trim();
                const price = parseFloat(item.price);
                const quantity = parseInt(item.quantity);

                if (name && !isNaN(price) && !isNaN(quantity) && quantity > 0) {
                    const existingProductEntry = Array.from(newProductsMap.entries()).find(
                      ([id, prod]) => prod.name === name && Number(prod.price) === price
                    );

                    if (existingProductEntry) {
                        const [existingId, existingProduct] = existingProductEntry;
                        newProductsMap.set(existingId, { ...existingProduct, quantity: Number(existingProduct.quantity) + Number(quantity) });
                    } else {
                        newProductsMap.set(++currentMaxId, {
                            id: currentMaxId,
                            name: name,
                            price: price,
                            quantity: quantity,
                        });
                    }
                }
            });
            setAvailableProducts(newProductsMap); 

        } else {
            setImageProcessingError("No se pudo extraer información de la imagen. Intenta con otra imagen o revisa el formato.");
        }
    } catch (error) {
        console.error("Error al analizar la imagen con Gemini:", error);
        setImageProcessingError("Error al analizar la imagen. Asegúrate de que es un recibo legible y tiene buena calidad.");
    } finally {
        setIsImageProcessing(false);
        setUploadedImageUrl(null);
    }
  };

  // Function to export data to Excel (CSV)
  const handleExportToExcel = () => {
    let csvContent = "";

    // 1. Resumen General
    csvContent += "# RESUMEN DE TOTALES\n";
    csvContent += `Total General Mesa (sin propina),${totalGeneralMesa.toLocaleString('es-CL')}\n`; 
    csvContent += `Propina Sugerida Recibo (10%),${propinaSugerida.toLocaleString('es-CL')}\n`; 
    csvContent += `Total Asignado a Comensales (con 10% propina/ítem),${currentTotalComensales.toLocaleString('es-CL')}\n`; 
    csvContent += `Diferencia Total (Recibo con Propina - Asignado),${remainingAmount.toLocaleString('es-CL')}\n`; 
    csvContent += `Propina Pendiente (Recibo - Asignado),${remainingPropinaDisplay.toLocaleString('es-CL')}\n`; 
    csvContent += "\n";

    // 2. Detalle de Consumo por Comensal
    csvContent += "# DETALLE DE CONSUMO POR COMENSAL\n";
    csvContent += "Comensal ID,Nombre Comensal,Nombre Ítem,Cantidad,Precio Unitario (con propina),Subtotal Ítem,Tipo de Ítem,Compartido entre (cantidad)\n";
    comensales.forEach(comensal => {
      if (comensal.selectedItems.length === 0) {
        csvContent += `${comensal.id},"${comensal.name}",,,,,\n`; // Empty row for comensals with no items
      } else {
        comensal.selectedItems.forEach(item => {
          const itemPriceFormatted = Number(item.price).toLocaleString('es-CL'); 
          const itemSubtotalFormatted = (Number(item.price) * Number(item.quantity)).toLocaleString('es-CL'); 
          const sharedBy = item.type === 'shared' ? Number(item.sharedByCount) : ''; 
          csvContent += `${comensal.id},"${comensal.name}","${item.name}",${Number(item.quantity)},"${itemPriceFormatted}","${itemSubtotalFormatted}",${item.type},${sharedBy}\n`;
        });
      }
    });
    csvContent += "\n";

    // 3. Totales por Comensal
    csvContent += "# TOTALES POR COMENSAL\n";
    csvContent += "Nombre Comensal,Total Comensal (con propina)\n";
    comensales.forEach(comensal => {
      csvContent += `"${comensal.name}",${comensal.total.toLocaleString('es-CL')}\n`; 
    });

    // Create a Blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { 
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_cuentas.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); 
      URL.revokeObjectURL(url); 
    } else {
      // Fallback for older browsers
      alert("Su navegador no soporta la descarga automática de archivos. Por favor, copie el texto y péguelo en un archivo CSV.");
      console.log(csvContent);
    }
  };


  // Define handleManualAddItem function
  const handleManualAddItem = () => {
    // CORRECCIÓN: Se añade una guarda para asegurar que la sesión esté lista.
    if (!shareId) {
        setManualItemMessage({ type: 'error', text: 'La sesión no está lista. Por favor, inténtalo de nuevo en un segundo.' });
        setTimeout(() => setManualItemMessage({ type: '', text: '' }), 3000);
        return;
    }

    if (manualItemName.trim() === '') {
      setManualItemMessage({ type: 'error', text: 'El nombre del ítem no puede estar vacío.' });
      return;
    }
    const price = parseFloat(manualItemPrice);
    if (isNaN(price) || price <= 0) {
      setManualItemMessage({ type: 'error', text: 'El precio debe ser un número positivo.' });
      return;
    }
    const quantity = parseInt(manualItemQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setManualItemMessage({ type: 'error', text: 'La cantidad debe ser un número entero positivo.' });
      return;
    }

    setAvailableProducts(prevMap => {
      const newMap = new Map(prevMap);
      let currentMaxId = Array.from(prevMap.values()).reduce((max, p) => Math.max(max, Number(p.id)), 0); 

      const existingProductEntry = Array.from(newMap.entries()).find(
        ([id, prod]) => prod.name === manualItemName.trim() && Number(prod.price) === price
      );

      if (existingProductEntry) {
        const [existingId, existingProduct] = existingProductEntry;
        newMap.set(existingId, { ...existingProduct, quantity: Number(existingProduct.quantity) + quantity }); 
      } else {
        newMap.set(++currentMaxId, {
          id: currentMaxId,
          name: manualItemName.trim(),
          price: price,
          quantity: quantity,
        });
      }
      return newMap;
    });

    setManualItemName('');
    setManualItemPrice('');
    setManualItemQuantity('');
    setManualItemMessage({ type: 'success', text: `Ítem "${manualItemName.trim()}" añadido.` });
    setTimeout(() => setManualItemMessage({ type: '', text: '' }), 3000);
  };

  // NEW: Inventory Management functions
  const handleRemoveInventoryItem = () => {
    if (!itemToRemoveFromInventoryId) {
      setRemoveInventoryItemMessage({ type: 'error', text: 'Por favor, selecciona un ítem para eliminar del inventario.' });
      return;
    }

    const itemIdToDelete = parseInt(itemToRemoveFromInventoryId);
    const itemToDelete = availableProducts.get(itemIdToDelete);

    if (!itemToDelete) {
      setRemoveInventoryItemMessage({ type: 'error', text: 'Ítem no encontrado en el inventario.' });
      return;
    }

    // Use custom confirmation modal
    setIsRemoveInventoryItemModalOpen(true);
  };

  const confirmRemoveInventoryItem = () => {
    setIsRemoveInventoryItemModalOpen(false); // Close modal
    const itemIdToDelete = parseInt(itemToRemoveFromInventoryId);
    const itemToDelete = availableProducts.get(itemIdToDelete); // Re-get item just in case

    if (!itemToDelete) { // Should not happen if modal opened correctly
      setRemoveInventoryItemMessage({ type: 'error', text: 'Ítem no encontrado en el inventario al confirmar.' });
      return;
    }

    setAvailableProducts(prevMap => {
      const newMap = new Map(prevMap);
      newMap.delete(itemIdToDelete);
      return newMap;
    });

    // Remove this item from all comensals' selected items
    setComensales(prevComensales => {
      return prevComensales.map(comensal => {
        const updatedItems = comensal.selectedItems.filter(item => {
          // If it's a full item, remove if ID matches
          if (item.type === 'full' && item.id === itemIdToDelete) {
            return false;
          }
          // If it's a shared item, remove if its original ID matches
          if (item.type === 'shared' && item.id === itemIdToDelete) {
            // Also clean up activeSharedInstances tracker for this specific item if it was shared
            setActiveSharedInstances(prevActiveSharedInstances => {
              const newActiveSharedInstances = new Map(prevActiveSharedInstances);
              newActiveSharedInstances.delete(item.shareInstanceId); // Remove this shared instance
              return newActiveSharedInstances;
            });
            return false;
          }
          return true; // Keep other items
        });

        const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        return { ...comensal, selectedItems: updatedItems, total: newTotal };
      });
    });

    setItemToRemoveFromInventoryId(''); // Reset dropdown
    setRemoveInventoryItemMessage({ type: 'success', text: `Ítem "${itemToDelete.name}" eliminado del inventario.` });
    setTimeout(() => setRemoveInventoryItemMessage({ type: '', text: '' }), 3000);
  };

  // NEW: Reset All Functionality
  const handleResetAll = () => {
    setIsResetAllModalOpen(true); // Open confirmation modal
  };

  const confirmResetAll = async () => { 
    setIsResetAllModalOpen(false); // Close modal

    // If there's a shareId, try to delete the document from Google Sheets
    if (shareId && userId) {
      await deleteStateFromGoogleSheets(shareId);
    }

    // Reset all state to initial values
    setAvailableProducts(new Map());
    setComensales([]);
    setTotalGeneralMesa(0);
    setPropinaSugerida(0);
    setIsShareModalOpen(false);
    setNewComensalName('');
    setAddComensalMessage({ type: '', text: '' });
    setManualItemName('');
    setManualItemPrice('');
    setManualItemQuantity('');
    setManualItemMessage({ type: '', text: '' });
    setItemToRemoveFromInventoryId('');
    setRemoveInventoryItemMessage({ type: '', text: '' });
    setIsImageProcessing(false);
    setUploadedImageUrl(null); 
    setActiveSharedInstances(new Map());
    setShareId(null); 

    // Clear the shareId from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, document.title, url.toString());


    // Also clear any open modals
    setIsClearComensalModalOpen(false);
    setIsRemoveComensalModalOpen(false);
    setIsClearAllComensalesModalOpen(false);
  };


  // Function to generate a shareable link
  const handleGenerateShareLink = async () => {
    if (!userId) {
      alert("Por favor, espera a que la autenticación se complete o recarga la página.");
      return;
    }

    // Validation for GOOGLE_SHEET_WEB_APP_URL
    if (GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
      alert("Error: Para generar un enlace compartible, debes configurar la URL de tu Google Apps Script en el código. Consulta las instrucciones.");
      console.error("GOOGLE_SHEET_WEB_APP_URL no está configurada correctamente.");
      return;
    }

    // Generate a new unique ID for this shared session
    const newShareId = `${userId}-${Date.now()}`;
    setShareId(newShareId); // Update the state with the new shareId

    // Save the current state to this new Google Sheet document
    const dataToSave = {
      comensales: comensales,
      availableProducts: Object.fromEntries(availableProducts),
      totalGeneralMesa: totalGeneralMesa,
      propinaSugerida: propinaSugerida,
      activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])),
      lastUpdated: new Date()
    };

    try {
      // CORRECCIÓN: Espera (await) a que el guardado termine ANTES de continuar.
      await saveStateToGoogleSheets(newShareId, dataToSave); 
      
      const currentBaseUrl = window.location.origin + window.location.pathname;
      const generatedLink = `${currentBaseUrl}?id=${newShareId}`;
      setShareLink(generatedLink);
      
      // Automatically copy to clipboard (using document.execCommand for broader iframe compatibility)
      const el = document.createElement('textarea');
      el.value = generatedLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert('¡Enlace copiado al portapapeles!');
    } catch (error) {
      console.error("Error al generar o guardar el enlace compartible:", error);
      alert("Error al generar el enlace compartible. Intenta de nuevo.");
    }
  };


  // Calculate the sum of all comensales' individual totals (these sums include per-item tips)
  const currentTotalComensales = comensales.reduce((sum, comensal) => sum + (Number(comensal.total) || 0), 0);

  // Calculate the remaining amount, comparing assigned total (with per-item tips)
  // against the receipt's total including its suggested tip.
  const totalBillWithReceiptTipCalculated = (Number(totalGeneralMesa) || 0) + (Number(propinaSugerida) || 0); 
  const remainingAmount = totalBillWithReceiptTipCalculated - currentTotalComensales;

  // The 'Propina Pendiente' now represents the difference between the receipt's
  // suggested tip and the total per-item tips collected so far.
  const totalPerItemTipsCollected = comensales.reduce((sumComensales, comensal) => {
    return sumComensales + comensal.selectedItems.reduce((sumItems, item) => {
        // Calculate tip amount for each item: item.price is priceWithTip, so (item.price / 1.10) is original base price.
        // Tip is item.price - (item.price / 1.10) OR item.price * (0.10 / 1.10)
        return sumItems + (Number(item.price) * Number(item.quantity) * (0.10 / 1.10)); // Ensure numbers
    }, 0);
  }, 0);

  const remainingPropinaDisplay = (Number(propinaSugerida) || 0) - totalPerItemTipsCollected;


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 font-inter text-gray-800">
      {/* ... Resto del JSX que no cambia ... */}
    </div>
  );
};

export default App;
