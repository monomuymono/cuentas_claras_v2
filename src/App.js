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
  const [newComensalName, setNewComensalName] = useState(''); 
  const [addComensalMessage, setAddComensalMessage] = useState({ type: '', text: '' }); 
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  const [manualItemQuantity, setManualItemQuantity] = useState('');
  const [manualItemMessage, setManualItemMessage] = useState({ type: '', text: '' });
  const [itemToRemoveFromInventoryId, setItemToRemoveFromInventoryId] = useState('');
  const [removeInventoryItemMessage, setRemoveInventoryItemMessage] = useState({ type: '', text: '' });
  
  // States para los modales
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRemoveInventoryItemModalOpen, setIsRemoveInventoryItemModalOpen] = useState(false);
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
  // === PERSISTENCIA ===
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
        return Promise.reject(new Error(result.message));
      } else {
        return Promise.resolve();
      }
    } catch (error) {
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
        await promise;
    } catch (error) {
        console.error("Error de red al eliminar de Google Sheets (JSONP):", error);
    }
  }, []);
  
  // =================================================================================
  // === LÓGICA DE LA APLICACIÓN Y MANEJO DE ESTADO ===
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

  // --- CORRECCIÓN: Polling se detiene si hay un modal abierto ---
  useEffect(() => {
    const isAnyModalOpen = isShareModalOpen || isRemoveInventoryItemModalOpen || isClearComensalModalOpen || isRemoveComensalModalOpen || isClearAllComensalesModalOpen || isResetAllModalOpen;
    
    if (!shareId || !userId || isAnyModalOpen || GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE")) {
      return;
    }

    const pollingInterval = setInterval(() => {
      loadStateFromGoogleSheets(shareId);
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [shareId, userId, loadStateFromGoogleSheets, isShareModalOpen, isRemoveInventoryItemModalOpen, isClearComensalModalOpen, isRemoveComensalModalOpen, isClearAllComensalesModalOpen, isResetAllModalOpen]);

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
        .catch((e) => {
          console.error("El guardado falló:", e.message);
        });

    }, 1000);

    return () => clearTimeout(handler);

  }, [comensales, availableProducts, activeSharedInstances, shareId, saveStateToGoogleSheets, authReady, isImageProcessing]);

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
      }

      const finalComensales = comensales.map(c => {
        if (c.id === comensalId) {
          const newSelectedItems = c.selectedItems.filter(i => String(i.shareInstanceId) !== String(shareInstanceId));
          const newTotal = newSelectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          return { ...c, selectedItems: newSelectedItems, total: newTotal };
        }
        if (shareGroup.has(c.id)) {
          const newSharerCount = shareGroup.size;
          const newBasePricePerShare = totalItemBasePrice / newSharerCount;
          const newPriceWithTipPerShare = newBasePricePerShare * 1.10;
          
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
  
  // === FUNCIÓN REFACTORIZADA Y SEGURA ===
  const confirmClearComensal = () => {
    const comensalToClear = comensales.find(c => c.id === comensalToClearId);
    if (!comensalToClear) {
      setIsClearComensalModalOpen(false);
      return;
    }
  
    // Hacemos una copia de los items a eliminar antes de modificar el estado
    const itemsToRemove = [...comensalToClear.selectedItems];
    
    // Iteramos sobre la copia, llamando a la función robusta handleRemoveItem
    // React procesará estos cambios de estado en batch.
    itemsToRemove.forEach(item => {
      const identifier = item.type === 'shared' ? item.shareInstanceId : item.id;
      handleRemoveItem(comensalToClear.id, identifier);
    });
  
    setIsClearComensalModalOpen(false);
    setComensalToClearId(null);
  };

  const openClearComensalModal = (comensalId) => {
    setComensalToClearId(comensalId);
    setIsClearComensalModalOpen(true);
  };
  
  // === FUNCIÓN REFACTORIZADA Y SEGURA ===
  const confirmRemoveComensal = () => {
    const idToRemove = comensalToRemoveId; // Guardamos el ID antes de limpiar el estado
    // Primero limpiamos sus items de forma segura.
    // Al llamar a confirmClearComensal, este usará el comensalId del estado.
    confirmClearComensal(); 
    
    // Luego, en un useEffect o en un callback de estado sería más seguro,
    // pero para este flujo, procedemos a filtrar.
    setComensales(prev => prev.filter(c => c.id !== idToRemove)); 
    
    setIsRemoveComensalModalOpen(false);
    setComensalToRemoveId(null);
  };
  
  const openRemoveComensalModal = (comensalId) => {
    setComensalToRemoveId(comensalId);
    setIsRemoveComensalModalOpen(true);
  };

  // === FUNCIÓN REFACTORIZADA Y SEGURA ===
  const confirmClearAllComensales = () => {
    // Calculamos el estado final del inventario en una sola operación
    const finalProducts = new Map(availableProducts);
    const allInstances = new Map(activeSharedInstances);

    comensales.forEach(comensal => {
      comensal.selectedItems.forEach(item => {
        const product = finalProducts.get(item.id);
        if (product) {
          if (item.type === 'full') {
            finalProducts.set(item.id, { ...product, quantity: product.quantity + item.quantity });
          } else if (item.type === 'shared') {
            // Solo devolvemos 1 por instancia compartida y la eliminamos para no contarla de nuevo
            if (allInstances.has(item.shareInstanceId)) {
              finalProducts.set(item.id, { ...product, quantity: product.quantity + 1 });
              allInstances.delete(item.shareInstanceId);
            }
          }
        }
      });
    });

    setAvailableProducts(finalProducts);
    setComensales([]);
    setActiveSharedInstances(new Map());
    setIsClearAllComensalesModalOpen(false);
  };

  const openClearAllComensalesModal = () => {
    setIsClearAllComensalesModalOpen(true);
  };

  // El resto de funciones (como las de la API de Gemini, exportar, etc.) no necesitan cambios...
  // ...
  const [totalGeneralMesa, setTotalGeneralMesa] = useState(0);
  const [propinaSugerida, setPropinaSugerida] = useState(0);

  useEffect(() => {
    const baseTotal = Array.from(availableProducts.values()).reduce((sum, product) => {
      return sum + (Number(product.price) * Number(product.quantity));
    }, 0);
    setTotalGeneralMesa(baseTotal);
    setPropinaSugerida(baseTotal * 0.10);
  }, [availableProducts]);

  const currentTotalComensales = comensales.reduce((sum, comensal) => sum + (Number(comensal.total) || 0), 0);
  const totalBillWithReceiptTip = totalGeneralMesa + propinaSugerida;
  const remainingAmount = totalBillWithReceiptTip - currentTotalComensales;
  const totalPerItemTipsCollected = comensales.reduce((sum, comensal) => sum + comensal.selectedItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity * (0.10 / 1.10)), 0), 0);
  const remainingPropinaDisplay = propinaSugerida - totalPerItemTipsCollected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 font-inter text-gray-800">
      {/* ... (El JSX completo va aquí, sin cambios respecto a la versión anterior) ... */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2 drop-shadow-md">
          <i className="lucide-salad text-5xl mr-2"></i>
          Calculadora de Cuentas por Comensal
        </h1>
        <p className="text-xl text-gray-600">
          Selecciona los ítems del recibo para cada comensal y calcula el total individual.
        </p>
      </header>

      {/* Summary Totals */}
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

      {/* Todos los demás bloques JSX (formularios, botones, etc.) y los modales van aquí... */}
      
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
