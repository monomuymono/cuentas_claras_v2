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
  const [isShareWarningModalOpen, setIsShareWarningModalOpen] = useState(false); // New state for shared item warning
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
        // Do NOT call onShareConfirm directly here, wait for modal confirmation
    } else {
        onShareConfirm(parseInt(selectedProductToShare), selectedComensalesForShare);
        onClose(); // Cierra el modal después de la confirmación
    }
  };

  const confirmShareWarning = () => {
    onShareConfirm(tempShareProductId, tempSharingComensalIds);
    setIsShareWarningModalOpen(false); // Close warning modal
    onClose(); // Close main share modal
  };

  // Filtra los productos disponibles que tienen cantidad > 0 para poder compartirlos
  const sharableProducts = Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0);

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Compartir Ítem</h2>

        {/* Selección de Producto */}
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

        {/* Selección de Comensales */}
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

        {/* Botones de Acción */}
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
  // Authentication states (simplified for Google Sheets)
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Google Sheets share ID for current session
  const [shareId, setShareId] = useState(null);
  const [shareLink, setShareLink] = useState('');

  // availableProducts is now a Map for easier quantity management
  const [availableProducts, setAvailableProducts] = useState(new Map());
  // Initialize totals to 0
  const [totalGeneralMesa, setTotalGeneralMesa] = useState(0); 
  const [propinaSugerida, setPropinaSugerida] = useState(0); 


  const [comensales, setComensales] = useState([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newComensalName, setNewComensalName] = useState(''); 
  const [addComensalMessage, setAddComensalMessage] = useState({ type: '', text: '' }); 

  // Manual Item input states
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  const [manualItemQuantity, setManualItemQuantity] = useState('');
  const [manualItemMessage, setManualItemMessage] = useState({ type: '', text: '' });

  // Inventory management states
  const [itemToRemoveFromInventoryId, setItemToRemoveFromInventoryId] = useState('');
  const [isRemoveInventoryItemModalOpen, setIsRemoveInventoryItemModalOpen] = useState(false);
  const [removeInventoryItemMessage, setRemoveInventoryItemMessage] = useState({ type: '', text: '' });


  // States for confirmation modals
  const [isClearComensalModalOpen, setIsClearComensalModalOpen] = useState(false);
  const [comensalToClearId, setComensalToClearId] = useState(null);
  const [isRemoveComensalModalOpen, setIsRemoveComensalModalOpen] = useState(false);
  const [comensalToRemoveId, setComensalToRemoveId] = useState(null);
  const [isClearAllComensalesModalOpen, setIsClearAllComensalesModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false); 


  // States for image processing
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageProcessingError, setImageProcessingError] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  // Map to track active shared instances and which comensales have them
  // Key: shareInstanceId, Value: Set<comensalId>
  const [activeSharedInstances, setActiveSharedInstances] = useState(new Map());
  
  // CORRECCIÓN: Ref para controlar las condiciones de carrera entre el guardado y el sondeo.
  const hasPendingChanges = useRef(false);

  // The target total for the whole bill, including the original receipt's suggested tip
  // This will now dynamically update based on totalGeneralMesa and propinaSugerida states
  // This value will be the *target* total for assigned items including tip.
  const totalBillWithReceiptTip = totalGeneralMesa + propinaSugerida;

  // Maximum number of comensales to prevent UI from becoming too crowded
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

    // CORRECCIÓN: El sondeo no debe ocurrir si hay cambios locales pendientes.
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
            // No actualizaremos el estado si hay cambios pendientes, para evitar sobrescribirlos.
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
  }, [hasPendingChanges]); // La dependencia ahora es el ref para re-evaluar si es necesario.

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


  // --- Authentication (simplified for Google Sheets) ---
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

  // --- Initial Load from URL or New Session ---
  useEffect(() => {
    if (!authReady || !userId) return; 

    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    if (idFromUrl) {
      setShareId(idFromUrl);
      loadStateFromGoogleSheets(idFromUrl);
    } else {
      // Start a fresh session if no ID in URL
      const newSessionId = `${userId}-${Date.now()}`;
      setShareId(newSessionId);
      // Don't save empty state immediately, it will save on first change.
    }
  }, [authReady, userId, loadStateFromGoogleSheets]);

  // --- Polling for Updates (simulated real-time for Google Sheets) ---
  useEffect(() => {
    // Only poll if shareId exists AND the URL is properly configured.
    if (!shareId || !userId || GOOGLE_SHEET_WEB_APP_URL === "YOUR_NEW_JSONP_WEB_APP_URL_HERE" || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) return; 

    const pollingInterval = setInterval(() => {
      // Llamada a la función de carga que ahora tiene la lógica de comprobación.
      loadStateFromGoogleSheets(shareId);
    }, 5000); // Aumentado el intervalo para reducir la probabilidad de conflictos.

    return () => clearInterval(pollingInterval); // Cleanup interval
  }, [shareId, userId, loadStateFromGoogleSheets]);

  // --- Save state whenever relevant states change (debounced) ---
  useEffect(() => {
    // No guardar si la sesión no está lista o si se está procesando una imagen.
    if (!shareId || !authReady || isImageProcessing) return;

    // Marcar que hay cambios pendientes.
    hasPendingChanges.current = true;

    const handler = setTimeout(() => {
      console.log("Guardando cambios pendientes...");
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
          // Si el guardado es exitoso, marcar que ya no hay cambios pendientes.
          hasPendingChanges.current = false;
          console.log("Cambios guardados. El sondeo puede reanudarse.");
        })
        .catch(() => {
          // Si el guardado falla, los cambios siguen pendientes.
          console.log("El guardado falló. Los cambios siguen marcados como pendientes.");
        });

    }, 1000); // Debounce saving

    return () => clearTimeout(handler);

  }, [comensales, availableProducts, totalGeneralMesa, propinaSugerida, activeSharedInstances, shareId, saveStateToGoogleSheets, authReady, isImageProcessing]);


  // Recalculate main totals whenever availableProducts changes
  useEffect(() => {
    const baseTotal = Array.from(availableProducts.values()).reduce((sum, product) => {
      return sum + (Number(product.price) * Number(product.quantity));
    }, 0);
    setTotalGeneralMesa(baseTotal);
    setPropinaSugerida(baseTotal * 0.10); // 10% of the new base total
  }, [availableProducts]);


  // Function to add a full item to a comensal's bill (now includes 10% tip)
  const handleAddItem = (comensalId, productId) => {
    const productInStock = availableProducts.get(productId);

    if (!productInStock || Number(productInStock.quantity) <= 0) {
      return;
    }

    setAvailableProducts(prevProductsMap => {
      const newMap = new Map(prevProductsMap);
      const product = newMap.get(productId);
      newMap.set(productId, { ...product, quantity: Number(product.quantity) - 1 });
      return newMap;
    });

    setComensales(prevComensales => {
      return prevComensales.map(comensal => {
        if (comensal.id === comensalId) {
          // CORRECCIÓN: Usa la variable `productInStock` que ya capturamos,
          // que contiene el estado del producto ANTES de la actualización del inventario.
          const productTemplate = productInStock; 
          
          if (productTemplate) {
            const priceWithTip = Number(productTemplate.price) * 1.10;
            let updatedItems = [...comensal.selectedItems];
            const existingItemIndex = updatedItems.findIndex(item => item.id === productId && item.type === 'full');

            if (existingItemIndex !== -1) {
              updatedItems = updatedItems.map((item, index) =>
                index === existingItemIndex ? { ...item, quantity: Number(item.quantity) + 1 } : item
              );
            } else {
              updatedItems = [...updatedItems, {
                ...productTemplate,
                price: priceWithTip,
                originalBasePrice: Number(productTemplate.price),
                quantity: 1,
                type: 'full'
              }];
            }

            const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
            return { ...comensal, selectedItems: updatedItems, total: newTotal, selectedProductId: "" };
          }
        }
        return comensal;
      });
    });
  };

  // Function to remove an item or decrease its quantity from a comensal's bill
  const handleRemoveItem = (comensalId, itemToRemoveIdentifier) => {
    setComensales(prevComensales => {
      return prevComensales.map(comensal => {
        if (comensal.id === comensalId) {
          const itemIndex = comensal.selectedItems.findIndex(item => {
            // Check for shared items by shareInstanceId, full items by original ID
            return item.type === 'shared' ? String(item.shareInstanceId) === String(itemToRemoveIdentifier) : item.id === Number(itemToRemoveIdentifier) && item.type === 'full';
          });

          // Initialize updatedItems as a copy of current items
          let updatedItems = [...comensal.selectedItems]; // Initialize here

          if (itemIndex !== -1) {
            const itemBeingRemoved = updatedItems[itemIndex];

            if (itemBeingRemoved.type === 'full') {
              if (Number(itemBeingRemoved.quantity) > 1) { // Ensure quantity is number
                updatedItems[itemIndex] = { ...itemBeingRemoved, quantity: Number(itemBeingRemoved.quantity) - 1 };
              } else {
                updatedItems.splice(itemIndex, 1); // Remove if quantity is 1
              }
              // Increment the quantity in availableProducts for full items (uses original product ID)
              setAvailableProducts(prevProductsMap => {
                const newMap = new Map(prevProductsMap);
                const product = newMap.get(itemBeingRemoved.id);
                if (product) {
                  newMap.set(product.id, { ...product, quantity: Number(product.quantity) + 1 }); // Ensure quantity is number
                }
                return newMap;
              });
            } else if (itemBeingRemoved.type === 'shared') {
                updatedItems.splice(itemIndex, 1);

                setActiveSharedInstances(prevActiveSharedInstances => {
                    const newActiveSharedInstances = new Map(prevActiveSharedInstances);
                    const comensalSet = newActiveSharedInstances.get(itemBeingRemoved.shareInstanceId);

                    if (comensalSet) {
                        comensalSet.delete(comensalId); // Remove this comensal from the set
                        if (comensalSet.size === 0) {
                            // If no one else is sharing this instance, return the original item to available products
                            setAvailableProducts(prevProductsMap => {
                                const productsMapCopy = new Map(prevProductsMap);
                                const product = productsMapCopy.get(itemBeingRemoved.id); // itemBeingRemoved.id is the original product ID
                                if (product) {
                                    productsMapCopy.set(product.id, { ...product, quantity: Number(product.quantity) + 1 }); // Restore 1 unit
                                }
                                return productsMapCopy;
                            });
                            newActiveSharedInstances.delete(itemBeingRemoved.shareInstanceId); // Clean up the shared instance tracker
                        }
                    }
                    return newActiveSharedInstances;
                });
            }
          }

          // Calculate new total for the comensal based on prices *con propina*
          const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0); // Ensure numbers
          return { ...comensal, selectedItems: updatedItems, total: newTotal };
        }
        return comensal;
      });
    });
  };


  // Function to clear all items for a comensal (but keep the comensal) - Refactored for single update
  const confirmClearComensal = () => {
    setIsClearComensalModalOpen(false); // Close modal

    // Find the comensal before updating state
    const comensalToClear = comensales.find(c => c.id === comensalToClearId);

    if (comensalToClear) {
      const productsToReturn = new Map();
      comensalToClear.selectedItems.forEach(item => {
        if (item.type === 'full') {
          productsToReturn.set(item.id, (productsToReturn.get(item.id) || 0) + Number(item.quantity)); // Ensure quantity is number
        } else if (item.type === 'shared') {
            setActiveSharedInstances(prevActiveSharedInstances => {
                const newActiveSharedInstances = new Map(prevActiveSharedInstances);
                const comensalSet = newActiveSharedInstances.get(item.shareInstanceId);
                if (comensalSet) {
                    comensalSet.delete(comensalToClearId);
                    if (comensalSet.size === 0) {
                        productsToReturn.set(item.id, (productsToReturn.get(item.id) || 0) + 1); // Add back one physical unit
                        newActiveSharedInstances.delete(item.shareInstanceId);
                    }
                }
                return newActiveSharedInstances;
            });
        }
      });

      // Update availableProductsMap in a single call
      setAvailableProducts(prevProductsMap => {
        const newMap = new Map(prevProductsMap);
        productsToReturn.forEach((qty, productId) => {
          const product = newMap.get(productId);
          if (product && newMap.has(productId)) {
            newMap.set(productId, { ...product, quantity: Number(product.quantity) + Number(qty) }); // Ensure quantity is number
          }
        });
        return newMap;
      });

      // Then update comensales
      setComensales(prevComensales => {
        return prevComensales.map(comensal => {
          if (comensal.id === comensalToClearId) {
            return { ...comensal, selectedItems: [], total: 0, selectedProductId: "" }; // Reset dropdown
          }
          return comensal;
        });
      });
    }
    setComensalToClearId(null); // Reset comensal ID after action
  };

  // Function to open confirmation modal for clearing a comensal
  const openClearComensalModal = (comensalId) => {
    setComensalToClearId(comensalId);
    setIsClearComensalModalOpen(true);
  };


  // Function to handle sharing an item among multiple comensales
  const handleShareItem = (productId, sharingComensalIds) => {
    const productToShare = availableProducts.get(productId);

    if (!productToShare || Number(productToShare.quantity) <= 0) { // Ensure quantity is number
      alert('Producto no disponible para compartir.');
      return;
    }

    // Decrement the quantity of the shared item from availableProducts (one physical item is consumed)
    setAvailableProducts(prevProductsMap => {
      const newMap = new Map(prevProductsMap);
      const product = newMap.get(productId);
      newMap.set(productId, { ...product, quantity: Number(product.quantity) - 1 }); // Ensure quantity is number
      return newMap;
    });

    // Calculate base price per share, then apply 10% tip to that portion
    const basePricePerShare = Number(productToShare.price) / Number(sharingComensalIds.length); // Ensure price is number
    const priceWithTipPerShare = basePricePerShare * 1.10; // Price with 10% tip

    const shareInstanceId = Date.now() + Math.random(); // Unique ID for this specific shared instance

    // Track which comensales are sharing this new instance
    setActiveSharedInstances(prevActiveSharedInstances => {
        const newActiveSharedInstances = new Map(prevActiveSharedInstances);
        newActiveSharedInstances.set(shareInstanceId, new Set(sharingComensalIds));
        return newActiveSharedInstances;
    });

    setComensales(prevComensales => {
      return prevComensales.map(comensal => {
        if (sharingComensalIds.includes(comensal.id)) {
          const updatedItems = [
            ...comensal.selectedItems,
            {
              id: productToShare.id, // Original product ID
              name: productToShare.name,
              price: priceWithTipPerShare, // Store the price with tip for this portion
              originalBasePrice: basePricePerShare, // Keep original base price for reference
              quantity: 1, // Represents one share instance
              type: 'shared',
              sharedByCount: Number(sharingComensalIds.length), // Ensure sharedByCount is number
              shareInstanceId: shareInstanceId // Unique ID for tracking this specific shared item instance
            }
          ];
          // Calculate new total for the comensal based on prices *con propina*
          const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0); // Ensure numbers
          return { ...comensal, selectedItems: updatedItems, total: newTotal, selectedProductId: "" }; // Reset dropdown
        }
        return comensal;
      });
    });
  };

  // Function to add a new comensal
  const handleAddComensal = () => {
    if (newComensalName.trim() === '') {
      setAddComensalMessage({ type: 'error', text: 'Por favor, ingresa un nombre para el nuevo comensal.' });
      return;
    }
    if (comensales.length >= MAX_COMENSALES) {
      setAddComensalMessage({ type: 'error', text: `No se pueden agregar más de ${MAX_COMENSALES} comensales.` });
      return;
    }

    // Generate a unique ID for the new comensal
    const newComensalId = comensales.length > 0 ? Math.max(...comensales.map(c => Number(c.id))) + 1 : 1; // Ensure c.id is number
    const newComensal = {
      id: newComensalId,
      name: newComensalName.trim(),
      selectedItems: [],
      total: 0,
      selectedProductId: "", // Initialize selectedProductId for new comensal
    };

    setComensales(prevComensales => [...prevComensales, newComensal]);
    setNewComensalName(''); // Clear the input field
    setAddComensalMessage({ type: 'success', text: `¡Comensal "${newComensal.name}" añadido con éxito!` });
    setTimeout(() => setAddComensalMessage({ type: '', text: '' }), 3000); // Clear after 3 seconds
  };

  // Function to remove a single comensal - Refactored for single update
  const confirmRemoveComensal = () => {
    setIsRemoveComensalModalOpen(false); // Close modal
    const comensalToRemove = comensales.find(c => c.id === comensalToRemoveId);

    if (comensalToRemove) {
      const productsToReturn = new Map();
      comensalToRemove.selectedItems.forEach(item => {
        if (item.type === 'full') {
          productsToReturn.set(item.id, (productsToReturn.get(item.id) || 0) + Number(item.quantity)); // Ensure quantity is number
        } else if (item.type === 'shared') {
            setActiveSharedInstances(prevActiveSharedInstances => {
                const newActiveSharedInstances = new Map(prevActiveSharedInstances);
                const comensalSet = newActiveSharedInstances.get(item.shareInstanceId);
                if (comensalSet) {
                    comensalSet.delete(comensalToRemoveId);
                    if (comensalSet.size === 0) {
                        productsToReturn.set(item.id, (productsToReturn.get(item.id) || 0) + 1); // Add back one physical unit
                        newActiveSharedInstances.delete(item.shareInstanceId);
                    }
                }
                return newActiveSharedInstances;
            });
        }
      });

      setAvailableProducts(prevProductsMap => {
        const newMap = new Map(prevProductsMap);
        productsToReturn.forEach((qty, productId) => {
          const product = newMap.get(productId);
          if (product && newMap.has(productId)) {
            newMap.set(productId, { ...product, quantity: Number(product.quantity) + Number(qty) }); // Ensure quantity is number
          }
        });
        return newMap;
      });

      setComensales(prevComensales => {
        return prevComensales.filter(c => c.id !== comensalToRemoveId);
      });
    }
    setComensalToRemoveId(null); // Reset comensal ID after action
  };

  // Function to open confirmation modal for removing a comensal
  const openRemoveComensalModal = (comensalId) => {
    setComensalToRemoveId(comensalId);
    setIsRemoveComensalModalOpen(true);
  };


  // Function to clear all items for a comensal (but keep the comensal) - Refactored for single update
  const confirmClearAllComensales = () => {
    setIsClearAllComensalesModalOpen(false); // Close modal

    const productsToReturn = new Map();

    // Iterate through all active shared instances to collect items to return
    activeSharedInstances.forEach((comensalSet, shareInstanceId) => {
        // Find one of the items that belongs to this shareInstanceId from the comensales' current items
        let originalProductIdForSharedInstance = null;
        for (const comensal of comensales) {
            for (const item of comensal.selectedItems) {
                if (item.type === 'shared' && String(item.shareInstanceId) === String(shareInstanceId)) { // Ensure comparison of shareInstanceId is safe
                    originalProductIdForSharedInstance = item.id;
                    break;
                }
            }
            if (originalProductIdForSharedInstance !== null) break;
        }

        if (originalProductIdForSharedInstance !== null) {
            // Restore one full unit for each unique shared instance that was active
            productsToReturn.set(originalProductIdForSharedInstance, (productsToReturn.get(originalProductIdForSharedInstance) || 0) + 1);
        }
    });

    comensales.forEach(comensal => {
      comensal.selectedItems.forEach(item => {
        if (item.type === 'full') {
          productsToReturn.set(item.id, (productsToReturn.get(item.id) || 0) + Number(item.quantity)); // Ensure quantity is number
        }
        // Shared items are handled by activeSharedInstances iteration above
      });
    });


    setAvailableProducts(prevProductsMap => {
      const newMap = new Map(prevProductsMap);
      productsToReturn.forEach((qty, productId) => {
        const product = newMap.get(productId);
        if (product && newMap.has(productId)) { // Ensure product still exists in map
          newMap.set(productId, { ...product, quantity: Number(product.quantity) + Number(qty) }); // Ensure quantity is number
        }
      });
      return newMap;
    });
    setComensales([]); // Clear all comensales
    setActiveSharedInstances(new Map()); // Reset all shared instances tracker
  };

  // Function to open confirmation modal for clearing all comensales
  const openClearAllComensalesModal = () => {
    setIsClearAllComensalesModalOpen(true);
  };

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

  const remainingPropinaDisplay = propinaSugerida - totalPerItemTipsCollected;


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 font-inter text-gray-800">
      {/* Page Title */}
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
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w_2xl mx-auto border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">Resumen de Totales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md shadow-sm">
            <span className="font-semibold text-blue-800">Total General Inventario (sin propina):</span> {/* Changed text */}
            <span className="text-blue-900 font-bold">${totalGeneralMesa.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center bg-green-50 p-3 rounded-md shadow-sm">
            <span className="font-semibold text-green-800">Propina Inventario (10%):</span> {/* Changed text */}
            <span className="text-green-900 font-bold">${propinaSugerida.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center bg-purple-50 p-3 rounded-md shadow-sm">
            <span className="font-semibold text-purple-800">Total Asignado a Comensales (con 10% propina/ítem):</span>
            <span className="text-purple-900 font-bold">${currentTotalComensales.toLocaleString('es-CL')}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-md shadow-sm ${Math.abs(remainingAmount) > 0.02 ? (remainingAmount > 0 ? 'bg-red-50' : 'bg-orange-50') : 'bg-green-50'}`}>
            <span className="font-semibold text-red-800">Diferencia Total (Inventario con Propina - Asignado):</span> {/* Changed text */}
            <span className="text-red-900 font-bold">${remainingAmount.toLocaleString('es-CL')}</span>
          </div>
        </div>
        {Math.abs(remainingAmount) > 0.02 && (
          <p className="mt-4 text-center text-sm text-red-600">
            Asegúrate de asignar todos los ítems para que el total de los comensales (con propina) coincida con el total del inventario (con propina).
          </p>
        )}
        <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-md shadow-sm mt-4">
            <span className="font-semibold text-yellow-800">Propina Pendiente (Inventario - Asignado):</span> {/* Changed text */}
            <span className="text-yellow-900 font-bold">${Math.max(0, remainingPropinaDisplay).toLocaleString('es-CL')}</span>
        </div>
      </div>

      {/* User Session Info */}
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


      {/* Add New Comensal Section */}
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

      {/* Manual Item Addition Section */}
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

      {/* Inventory Management Section */}
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


      {/* Image Upload and Analysis Section */}
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
          <p className={`mt-4 text-center text-red-600 text-sm ${imageProcessingError ? '' : 'hidden'}`}> {/* Always render but hide if no error */}
            Error: {imageProcessingError}
          </p>
        )}
        {uploadedImageUrl && !isImageProcessing && !imageProcessingError && (
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Imagen cargada:</p>
                <img src={uploadedImageUrl} alt="Recibo cargado" className="max-w_xl h-auto rounded-md border border-gray-300 mx-auto" style={{ maxHeight: '200px' }} />
            </div>
        )}
      </div>


      {/* Global Action Buttons (Share and Clear All Comensales) */}
      <div className="text-center mb-8 flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={handleGenerateShareLink} // Added button for sharing
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
        {comensales.length > 0 && ( /* Only show if there are comensales */
          <button
            onClick={openClearAllComensalesModal} // Call custom modal
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            <i className="lucide-trash-2 mr-2"></i> Eliminar Todos los Comensales
          </button>
        )}
        <button
          onClick={handleExportToExcel}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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


      {/* Comensal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {comensales.map(comensal => (
          <div key={String(comensal.id)} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transform hover:scale-105 transition-transform duration-200 ease-in-out flex flex-col h-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              <i className="lucide-user text-2xl mr-2 text-blue-500"></i>
              {comensal.name}
            </h3>

            {/* Product Selector */}
            <div className="mb-4">
              <label htmlFor={`product-select-${comensal.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                Agregar Ítem Individual:
              </label>
              <select
                id={`product-select-${comensal.id}`}
                value={comensal.selectedProductId || ""} // Controlled component
                onChange={(e) => handleAddItem(comensal.id, parseInt(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
              >
                <option value="" disabled>Selecciona un producto</option>
                {Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0).map(product => ( // Ensure quantity is number
                  <option key={String(product.id)} value={product.id}>
                    {product.name} (${Number(product.price).toLocaleString('es-CL')}) (Disp: {Number(product.quantity)}) {/* Changed to 'es-CL' */}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Items List */}
            <div className="flex-grow">
              {comensal.selectedItems.length > 0 ? (
                <ul className="space-y-2 mb-4 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto">
                  {comensal.selectedItems.map(item => (
                    <li key={String(item.type === 'shared' ? item.shareInstanceId : item.id)} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">
                        {item.type === 'shared' ? `1/${Number(item.sharedByCount)} x ${item.name}` : `${Number(item.quantity)} x ${item.name}`}
                        {item.type === 'full' && ` (+10% Propina)`}
                        {item.type === 'shared' && ` (+10% Propina)`}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">${(Number(item.price) * Number(item.quantity)).toLocaleString('es-CL')}</span> {/* Changed to 'es-CL' */}
                        <button
                          // Use shareInstanceId for shared items, otherwise original product ID for full items
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

            {/* Comensal Total */}
            <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">Total (con propina):</span>
              <span className="text-2xl font-extrabold text-blue-700">${comensal.total.toLocaleString('es-CL')}</span> {/* Changed to 'es-CL' */}
            </div>

            {/* Clear and Remove Comensal Buttons */}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => openClearComensalModal(comensal.id)} // Call custom modal
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-md shadow-md hover:bg-orange-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
              >
                Limpiar Consumo
              </button>
              <button
                onClick={() => openRemoveComensalModal(comensal.id)} // Call custom modal
                className="w-full bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Eliminar Comensal
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Global Totals */}
      <footer className="mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-200 max_w_2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">¡Cuentas Claras!</h2>
        <div className="flex justify-around items-center text-xl font-semibold">
          <div className="text-gray-700">
            Total Asignado (con propina): <span className="text-green-700 font-extrabold">${currentTotalComensales.toLocaleString('es-CL')}</span> {/* Changed to 'es-CL' */}
          </div>
          <div className="text-gray-700">
            Propina Pendiente: <span className="text-orange-700 font-extrabold">${Math.max(0, remainingPropinaDisplay).toLocaleString('es-CL')}</span> {/* Changed to 'es-CL' */}
          </div>
        </div>
        <p className="mt-4 text-gray-500 text-sm">
          Puedes ajustar los montos seleccionando y deseleccionando ítems para cada comensal.
        </p>
      </footer>

      {/* Modals de Confirmación */}
      <ConfirmationModal
        isOpen={isClearComensalModalOpen}
        onClose={() => setIsClearComensalModalOpen(false)}
        onConfirm={confirmClearComensal}
        message="¿Estás seguro de que deseas limpiar todo el consumo para este comensal? Sus ítems no compartidos se devolverán al inventario."
        confirmText="Limpiar Consumo"
      />

      <ConfirmationModal
        isOpen={isRemoveComensalModalOpen}
        onClose={() => setIsRemoveComensalModalOpen(false)}
        onConfirm={confirmRemoveComensal}
        message="¿Estás seguro de que deseas eliminar este comensal? Su consumo se devolverá al inventario general (solo ítems no compartidos)."
        confirmText="Eliminar Comensal"
      />

      <ConfirmationModal
        isOpen={isClearAllComensalesModalOpen}
        onClose={() => setIsClearAllComensalesModalOpen(false)}
        onConfirm={confirmClearAllComensales}
        message="¿Estás seguro de que deseas eliminar a TODOS los comensales? Todo el consumo asignado se devolverá al inventario general (solo ítems no compartidos)."
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

      {/* Modal de Compartir Ítem */}
      <ShareItemModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        availableProducts={availableProducts}
        comensales={comensales}
        onShareConfirm={handleShareItem}
      />

    {/* Confirmation for removing item from inventory */}
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
