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
  const MAX_COMENSALES = 20;

  // =================================================================================
  // === INICIO DE FUNCIONES DE PERSISTENCIA ===
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
      return;
    }
    if (!idToLoad) return;

    if (hasPendingChanges.current) {
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
                return;
            }
            setComensales(data.comensales || []);
            setAvailableProducts(new Map(Object.entries(data.availableProducts || {})));
            setActiveSharedInstances(new Map(Object.entries(data.activeSharedInstances || {}).map(([key, value]) => [key, new Set(value)])));
        } else {
            setComensales([]);
            setAvailableProducts(new Map());
            setActiveSharedInstances(new Map());
            const url = new URL(window.location.href);
            url.searchParams.delete('id');
            window.history.replaceState({}, document.title, url.toString());
            setShareId(null);
        }
    } catch (error) {
        console.error("Error al cargar con JSONP:", error);
    }
  }, []);

  const deleteStateFromGoogleSheets = useCallback(async (idToDelete) => {
    if (GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
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
        }
    } catch (error) {
        console.error("Error de red al eliminar de Google Sheets (JSONP):", error);
    }
  }, []);
  // =================================================================================
  // === FIN DE FUNCIONES DE PERSISTENCIA ===
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

  }, [comensales, availableProducts, activeSharedInstances, shareId, saveStateToGoogleSheets, authReady, isImageProcessing]);
  
  // ==================================================================
  // === INICIO DE FUNCIONES DE MANEJO DE ESTADO ROBUSTAS ===
  // ==================================================================

  const handleAddItem = (comensalId, productId) => {
    const productInStock = availableProducts.get(productId);
    if (!productInStock || Number(productInStock.quantity) <= 0) return;

    const newProductsMap = new Map(availableProducts);
    newProductsMap.set(productId, { ...productInStock, quantity: Number(productInStock.quantity) - 1 });

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
        let newComensales = comensales.map(c => {
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

        } else {
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
  
  const handleAddComensal = () => {
    if (newComensalName.trim() === '') {
      setAddComensalMessage({ type: 'error', text: 'Por favor, ingresa un nombre para el nuevo comensal.' });
      return;
    }
    if (comensales.length >= MAX_COMENSALES) {
      setAddComensalMessage({ type: 'error', text: `No se pueden agregar más de ${MAX_COMENSALES} comensales.` });
      return;
    }

    const newComensalId = comensales.length > 0 ? Math.max(...comensales.map(c => c.id)) + 1 : 1;
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
  
  const confirmClearComensal = () => {
    setIsClearComensalModalOpen(false);
    const comensalToClear = comensales.find(c => c.id === comensalToClearId);
  
    if (comensalToClear) {
      // Usamos una copia para iterar, ya que el estado se actualizará con cada llamada a handleRemoveItem
      const itemsToRemove = [...comensalToClear.selectedItems];
      // Iteramos en reversa para evitar problemas con los índices al eliminar
      for (let i = itemsToRemove.length - 1; i >= 0; i--) {
        const item = itemsToRemove[i];
        const identifier = item.type === 'shared' ? item.shareInstanceId : item.id;
        handleRemoveItem(comensalToClear.id, identifier);
      }
    }
    setComensalToClearId(null);
  };

  const openClearComensalModal = (comensalId) => {
    setComensalToClearId(comensalId);
    setIsClearComensalModalOpen(true);
  };
  
  const confirmRemoveComensal = () => {
    const idToRemove = comensalToRemoveId;
    setComensalToClearId(idToRemove); // Preparamos el ID para la función de limpiar
    confirmClearComensal(); // Limpiamos todos sus items de forma segura
    setComensales(prev => prev.filter(c => c.id !== idToRemove)); // Finalmente, lo eliminamos
    setIsRemoveComensalModalOpen(false);
    setComensalToRemoveId(null);
  };
  
  const openRemoveComensalModal = (comensalId) => {
    setComensalToRemoveId(comensalId);
    setIsRemoveComensalModalOpen(true);
  };

  const confirmClearAllComensales = () => {
    setIsClearAllComensalesModalOpen(false);

    // Creamos una copia de los productos para restaurar las cantidades
    const newProducts = new Map(availableProducts);
    comensales.forEach(comensal => {
        comensal.selectedItems.forEach(item => {
            const product = newProducts.get(item.id);
            if (product) {
                if (item.type === 'full') {
                    product.quantity += item.quantity;
                } else if (item.type === 'shared') {
                    // Para ítems compartidos, solo devolvemos 1 por instancia
                    const shareGroup = activeSharedInstances.get(item.shareInstanceId);
                    if (shareGroup && shareGroup.size > 0) {
                        product.quantity += 1;
                        shareGroup.clear(); // Marcamos como procesado para no sumarlo de nuevo
                    }
                }
            }
        });
    });

    setAvailableProducts(newProducts);
    setComensales([]);
    setActiveSharedInstances(new Map());
  };

  const openClearAllComensalesModal = () => {
    setIsClearAllComensalesModalOpen(true);
  };
  
  // ==================================================================
  // === FIN DE LAS FUNCIONES DE MANEJO DE ESTADO ===
  // ==================================================================

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedImageUrl(URL.createObjectURL(file));
      setIsImageProcessing(true);
      setImageProcessingError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result.split(',')[1];
        analyzeImageWithGemini(base64Image, file.type);
      };
      reader.onerror = () => {
        setImageProcessingError("Error al cargar la imagen.");
        setIsImageProcessing(false);
        setUploadedImageUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithGemini = async (base64ImageData, mimeType) => {
    try {
        const prompt = `Analiza la imagen de recibo adjunta.
        Extrae todos los ítems individuales de comida y bebida, sus cantidades y sus precios base.
        Proporciona la salida como un objeto JSON con la siguiente propiedad:
        - items: (array de objetos) Lista de ítems. Cada objeto debe tener:
            - name: (string) El nombre del ítem.
            - quantity: (integer) El número de unidades de este ítem.
            - price: (number) El precio base numérico de una sola unidad de este ítem. Usa un punto para los decimales si los hay, y no uses separadores de miles.
        Ejemplo de formato JSON:
        {
          "items": [
            {"name": "Heineken 500cc", "quantity": 4, "price": 4990},
            {"name": "Mechada Italiana", "quantity": 5, "price": 11990}
          ]
        }`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64ImageData } }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: { "items": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "name": { "type": "STRING" }, "quantity": { "type": "INTEGER" }, "price": { "type": "NUMBER" } }, "required": ["name", "quantity", "price"] } } },
                    required: ["items"]
                }
            }
        };

        const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyDMhW9Fxz2kLG7HszVnBDmgQMJwzXSzd9U";

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

        if (result.candidates && result.candidates[0].content.parts[0].text) {
            const json = result.candidates[0].content.parts[0].text;
            const parsedData = JSON.parse(json); 

            setComensales([]); 
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
                        currentMaxId++;
                        newProductsMap.set(currentMaxId, {
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

  const handleExportToExcel = () => {
    let csvContent = "";

    csvContent += "# RESUMEN DE TOTALES\n";
    csvContent += `Total General Mesa (sin propina),${totalGeneralMesa.toLocaleString('es-CL')}\n`; 
    csvContent += `Propina Sugerida Recibo (10%),${propinaSugerida.toLocaleString('es-CL')}\n`; 
    csvContent += `Total Asignado a Comensales (con 10% propina/ítem),${currentTotalComensales.toLocaleString('es-CL')}\n`; 
    csvContent += `Diferencia Total (Recibo con Propina - Asignado),${remainingAmount.toLocaleString('es-CL')}\n`; 
    csvContent += `Propina Pendiente (Recibo - Asignado),${remainingPropinaDisplay.toLocaleString('es-CL')}\n`; 
    csvContent += "\n";
    csvContent += "# DETALLE DE CONSUMO POR COMENSAL\n";
    csvContent += "Comensal ID,Nombre Comensal,Nombre Ítem,Cantidad,Precio Unitario (con propina),Subtotal Ítem,Tipo de Ítem,Compartido entre (cantidad)\n";
    comensales.forEach(comensal => {
      if (comensal.selectedItems.length === 0) {
        csvContent += `${comensal.id},"${comensal.name}",,,,,\n`;
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
    csvContent += "# TOTALES POR COMENSAL\n";
    csvContent += "Nombre Comensal,Total Comensal (con propina)\n";
    comensales.forEach(comensal => {
      csvContent += `"${comensal.name}",${comensal.total.toLocaleString('es-CL')}\n`; 
    });

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
      alert("Su navegador no soporta la descarga automática de archivos. Por favor, copie el texto y péguelo en un archivo CSV.");
      console.log(csvContent);
    }
  };


  const handleManualAddItem = () => {
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
        currentMaxId++;
        newMap.set(currentMaxId, {
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

    setIsRemoveInventoryItemModalOpen(true);
  };

  const confirmRemoveInventoryItem = () => {
    setIsRemoveInventoryItemModalOpen(false);
    const itemIdToDelete = parseInt(itemToRemoveFromInventoryId);

    setAvailableProducts(prevMap => {
      const newMap = new Map(prevMap);
      newMap.delete(itemIdToDelete);
      return newMap;
    });

    const newComensales = comensales.map(comensal => {
      const updatedItems = comensal.selectedItems.filter(item => {
        if (item.id === itemIdToDelete) {
          if(item.type === 'shared') {
            setActiveSharedInstances(prev => {
              const newInstances = new Map(prev);
              newInstances.delete(item.shareInstanceId);
              return newInstances;
            });
          }
          return false;
        }
        return true;
      });
      const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
      return { ...comensal, selectedItems: updatedItems, total: newTotal };
    });
    setComensales(newComensales);

    setItemToRemoveFromInventoryId('');
    setRemoveInventoryItemMessage({ type: 'success', text: `Ítem eliminado del inventario.` });
    setTimeout(() => setRemoveInventoryItemMessage({ type: '', text: '' }), 3000);
  };

  const handleResetAll = () => {
    setIsResetAllModalOpen(true);
  };

  const confirmResetAll = async () => { 
    setIsResetAllModalOpen(false);

    if (shareId && userId) {
      await deleteStateFromGoogleSheets(shareId);
    }

    setAvailableProducts(new Map());
    setComensales([]);
    setActiveSharedInstances(new Map());
    setShareId(null); 
    setShareLink('');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, document.title, url.toString());

    setIsClearComensalModalOpen(false);
    setIsRemoveComensalModalOpen(false);
    setIsClearAllComensalesModalOpen(false);
  };


  const handleGenerateShareLink = async () => {
    if (!userId) {
      alert("Por favor, espera a que la autenticación se complete o recarga la página.");
      return;
    }

    if (GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
      alert("Error: Para generar un enlace compartible, debes configurar la URL de tu Google Apps Script en el código. Consulta las instrucciones.");
      return;
    }

    const newShareId = `${userId}-${Date.now()}`;
    setShareId(newShareId);

    const dataToSave = {
      comensales,
      availableProducts: Object.fromEntries(availableProducts),
      activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])),
      lastUpdated: new Date()
    };

    try {
      await saveStateToGoogleSheets(newShareId, dataToSave); 
      
      const currentBaseUrl = window.location.origin + window.location.pathname;
      const generatedLink = `${currentBaseUrl}?id=${newShareId}`;
      setShareLink(generatedLink);
      
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
  
  const totalGeneralMesa = Array.from(availableProducts.values()).reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const propinaSugerida = totalGeneralMesa * 0.10;
  const currentTotalComensales = comensales.reduce((sum, comensal) => sum + (Number(comensal.total) || 0), 0);
  const totalBillWithReceiptTip = totalGeneralMesa + propinaSugerida;
  const remainingAmount = totalBillWithReceiptTip - currentTotalComensales;
  const totalPerItemTipsCollected = comensales.reduce((sum, comensal) => sum + comensal.selectedItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity * (0.10 / 1.10)), 0), 0);
  const remainingPropinaDisplay = propinaSugerida - totalPerItemTipsCollected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 font-inter text-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2 drop-shadow-md">
          <i className="lucide-salad text-5xl mr-2"></i>
          Calculadora de Cuentas por Comensal
        </h1>
        <p className="text-xl text-gray-600">
          Selecciona los ítems del recibo para cada comensal y calcula el total individual.
        </p>
      </header>

      {/* ... (El resto del JSX es idéntico y se incluye aquí) ... */}
      
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max_w_2xl mx-auto border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">Resumen de Totales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md shadow-sm">
            <span className="font-semibold text-blue-800">Total General Inventario (sin propina):</span>
            <span className="text-blue-900 font-bold">${totalGeneralMesa.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center bg-green-50 p-3 rounded-md shadow-sm">
            <span className="font-semibold text-green-800">Propina Inventario (10%):</span>
            <span className="text-green-900 font-bold">${propinaSugerida.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center bg-purple-50 p-3 rounded-md shadow-sm">
            <span className="font-semibold text-purple-800">Total Asignado a Comensales (con 10% propina/ítem):</span>
            <span className="text-purple-900 font-bold">${currentTotalComensales.toLocaleString('es-CL')}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-md shadow-sm ${Math.abs(remainingAmount) > 0.02 ? (remainingAmount > 0 ? 'bg-red-50' : 'bg-orange-50') : 'bg-green-50'}`}>
            <span className="font-semibold text-red-800">Diferencia Total (Inventario con Propina - Asignado):</span>
            <span className="text-red-900 font-bold">${remainingAmount.toLocaleString('es-CL')}</span>
          </div>
        </div>
        {Math.abs(remainingAmount) > 0.02 && (
          <p className="mt-4 text-center text-sm text-red-600">
            Asegúrate de asignar todos los ítems para que el total de los comensales (con propina) coincida con el total del inventario (con propina).
          </p>
        )}
        <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-md shadow-sm mt-4">
            <span className="font-semibold text-yellow-800">Propina Pendiente (Inventario - Asignado):</span>
            <span className="text-yellow-900 font-bold">${Math.max(0, remainingPropinaDisplay).toLocaleString('es-CL')}</span>
        </div>
      </div>

      {userId && (
        <div className="bg-white p-4 rounded-xl shadow-lg mb-8 max_w_xl mx-auto border border-blue-200 text-center text-sm text-gray-600">
          <p>Tu ID de sesión: <span className="font-semibold text-gray-800">{userId}</span></p>
          {shareId && <p>ID del documento de la sesión actual: <span className="font-semibold text-gray-800">{shareId}</span></p>}
          {shareLink && (
            <div className="mt-2 flex flex-col items-center">
              <p>Enlace compartible:</p>
              <a href={shareLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                {shareLink}
              </a>
              <button
                onClick={() => {
                  const el = document.createElement('textarea');
                  el.value = shareLink;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                  alert('¡Enlace copiado al portapapeles!');
                }}
                className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              >
                Copiar Enlace
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max_w_xl mx-auto border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">
          <i className="lucide-user-plus text-3xl mr-2"></i>
          Agregar Nuevo Comensal
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Nombre del Comensal"
            value={newComensalName}
            onChange={(e) => setNewComensalName(e.target.value)}
            className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddComensal}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full sm:w-auto"
          >
            Añadir Comensal
          </button>
        </div>
        {addComensalMessage.text && (
          <p className={`mt-4 text-center text-sm ${addComensalMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {addComensalMessage.text}
          </p>
        )}
        {comensales.length >= MAX_COMENSALES && (
          <p className="mt-4 text-center text-sm text-red-600">
            Se ha alcanzado el número máximo de comensales ({MAX_COMENSALES}).
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max_w_xl mx-auto border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">
          <i className="lucide-plus-circle mr-2"></i>
          Agregar Ítem Manualmente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nombre del Ítem"
            value={manualItemName}
            onChange={(e) => setManualItemName(e.target.value)}
            className="p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 col-span-2 sm:col-span-1"
          />
          <input
            type="number"
            placeholder="Precio Base (sin propina)"
            value={manualItemPrice}
            onChange={(e) => setManualItemPrice(e.target.value)}
            className="p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="number"
            placeholder="Cantidad"
            value={manualItemQuantity}
            onChange={(e) => setManualItemQuantity(e.target.value)}
            className="p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleManualAddItem}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 col-span-2"
          >
            Añadir Ítem
          </button>
        </div>
        {manualItemMessage.text && (
          <p className={`mt-4 text-center text-sm ${manualItemMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {manualItemMessage.text}
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max_w_xl mx-auto border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">
          <i className="lucide-archive mr-2"></i>
          Administrar Inventario
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <select
            value={itemToRemoveFromInventoryId}
            onChange={(e) => setItemToRemoveFromInventoryId(e.target.value)}
            className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecciona ítem a eliminar del inventario</option>
            {Array.from(availableProducts.values()).map(product => (
              <option key={String(product.id)} value={product.id}>
                {product.name} (${Number(product.price).toLocaleString('es-CL')}) (Disp: {Number(product.quantity)})
              </option>
            ))}
          </select>
          <button
            onClick={handleRemoveInventoryItem}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 w-full sm:w-auto"
          >
            Eliminar del Inventario
          </button>
        </div>
        {removeInventoryItemMessage.text && (
          <p className={`mt-4 text-center text-sm ${removeInventoryItemMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {removeInventoryItemMessage.text}
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max_w_xl mx-auto border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">
          <i className="lucide-camera text-3xl mr-2"></i>
          Cargar y Analizar Recibo
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            aria-label="Cargar imagen de recibo"
            disabled={isImageProcessing}
          />
        </div>
        {isImageProcessing && (
          <p className="mt-4 text-center text-blue-600 font-semibold flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando imagen...
          </p>
        )}
        {imageProcessingError && (
          <p className={`mt-4 text-center text-red-600 text-sm`}>
            Error: {imageProcessingError}
          </p>
        )}
        {uploadedImageUrl && (
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Imagen cargada:</p>
                <img src={uploadedImageUrl} alt="Recibo cargado" className="max-w_xl h-auto rounded-md border border-gray-300 mx-auto" style={{ maxHeight: '200px' }} />
            </div>
        )}
      </div>

      <div className="text-center mb-8 flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={handleGenerateShareLink}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          <i className="lucide-link mr-2"></i> Generar Enlace Compartible
        </button>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          <i className="lucide-share-2 mr-2"></i> Compartir Ítem
        </button>
        {comensales.length > 0 && (
          <button
            onClick={openClearAllComensalesModal}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            <i className="lucide-trash-2 mr-2"></i> Eliminar Todos los Comensales
          </button>
        )}
        <button
          onClick={handleExportToExcel}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        >
          <i className="lucide-download-cloud mr-2"></i> Exportar a Excel
        </button>
        <button
          onClick={handleResetAll}
          className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
        >
          <i className="lucide-rotate-ccw mr-2"></i> Resetear Todo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {comensales.map(comensal => (
          <div key={String(comensal.id)} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transform hover:scale-105 transition-transform duration-200 ease-in-out flex flex-col h-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              <i className="lucide-user text-2xl mr-2 text-blue-500"></i>
              {comensal.name}
            </h3>
            <div className="mb-4">
              <label htmlFor={`product-select-${comensal.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                Agregar Ítem Individual:
              </label>
              <select
                id={`product-select-${comensal.id}`}
                value={""}
                onChange={(e) => handleAddItem(comensal.id, parseInt(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
              >
                <option value="" disabled>Selecciona un producto</option>
                {Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0).map(product => (
                  <option key={String(product.id)} value={product.id}>
                    {product.name} (${Number(product.price).toLocaleString('es-CL')}) (Disp: {Number(product.quantity)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-grow">
              {comensal.selectedItems.length > 0 ? (
                <ul className="space-y-2 mb-4 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto">
                  {comensal.selectedItems.map((item, index) => (
                    <li key={`${item.id}-${item.type}-${index}`} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">
                        {item.type === 'shared' ? `1/${Number(item.sharedByCount)} x ${item.name}` : `${Number(item.quantity)} x ${item.name}`}
                        {` (+10% Propina)`}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">${(Number(item.price) * Number(item.quantity)).toLocaleString('es-CL')}</span>
                        <button
                          onClick={() => handleRemoveItem(comensal.id, item.type === 'shared' ? item.shareInstanceId : item.id)}
                          className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                          aria-label="Remove item"
                        >
                          <i className="lucide-minus text-xs"></i>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 text-sm py-4">Aún no hay ítems seleccionados.</p>
              )}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">Total (con propina):</span>
              <span className="text-2xl font-extrabold text-blue-700">${comensal.total.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => openClearComensalModal(comensal.id)}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-md shadow-md hover:bg-orange-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
              >
                Limpiar Consumo
              </button>
              <button
                onClick={() => openRemoveComensalModal(comensal.id)}
                className="w-full bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Eliminar Comensal
              </button>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-200 max_w_2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">¡Cuentas Claras!</h2>
        <div className="flex justify-around items-center text-xl font-semibold">
          <div className="text-gray-700">
            Total Asignado (con propina): <span className="text-green-700 font-extrabold">${currentTotalComensales.toLocaleString('es-CL')}</span>
          </div>
          <div className="text-gray-700">
            Propina Pendiente: <span className="text-orange-700 font-extrabold">${Math.max(0, remainingPropinaDisplay).toLocaleString('es-CL')}</span>
          </div>
        </div>
        <p className="mt-4 text-gray-500 text-sm">
          Puedes ajustar los montos seleccionando y deseleccionando ítems para cada comensal.
        </p>
      </footer>

      <ConfirmationModal
        isOpen={isClearComensalModalOpen}
        onClose={() => setIsClearComensalModalOpen(false)}
        onConfirm={confirmClearComensal}
        message="¿Estás seguro de que deseas limpiar todo el consumo para este comensal? Todos sus ítems se devolverán al inventario."
        confirmText="Limpiar Consumo"
      />

      <ConfirmationModal
        isOpen={isRemoveComensalModalOpen}
        onClose={() => setIsRemoveComensalModalOpen(false)}
        onConfirm={confirmRemoveComensal}
        message="¿Estás seguro de que deseas eliminar este comensal? Su consumo se devolverá al inventario general."
        confirmText="Eliminar Comensal"
      />

      <ConfirmationModal
        isOpen={isClearAllComensalesModalOpen}
        onClose={() => setIsClearAllComensalesModalOpen(false)}
        onConfirm={confirmClearAllComensales}
        message="¿Estás seguro de que deseas eliminar a TODOS los comensales? Todo el consumo asignado se devolverá al inventario."
        confirmText="Eliminar Todos"
      />

      <ConfirmationModal
        isOpen={isResetAllModalOpen}
        onClose={() => setIsResetAllModalOpen(false)}
        onConfirm={confirmResetAll}
        message="¿Estás seguro de que deseas resetear toda la aplicación? Esto borrará todos los comensales, productos y totales."
        confirmText="Sí, Resetear Todo"
        cancelText="Cancelar"
      />

      <ShareItemModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        availableProducts={availableProducts}
        comensales={comensales}
        onShareConfirm={handleShareItem}
      />

    <ConfirmationModal
      isOpen={isRemoveInventoryItemModalOpen}
      onClose={() => setIsRemoveInventoryItemModalOpen(false)}
      onConfirm={confirmRemoveInventoryItem}
      message={`¿Estás seguro de que quieres eliminar "${availableProducts.get(Number(itemToRemoveFromInventoryId))?.name || 'este ítem'}" del inventario? Esto también lo eliminará de todas las cuentas de los comensales.`}
      confirmText="Sí, Eliminar"
      cancelText="No, Mantener"
    />
    </div>
  );
};

export default App;
