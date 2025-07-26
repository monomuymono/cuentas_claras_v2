import React, { useState, useEffect, useCallback, useRef } from 'react';

// Polyfill para 'process' si no está definido
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {} };
}

// URL de tu Google Apps Script Web App
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzI_sW6-SKJy8K3M1apb_hdmafjE9gz8ZF7UPrYKfeI5eBGDKmqagl6HLxnB0ILeY67JA/exec";

// --- Componentes de la Interfaz (Modales y Pasos) ---

// Componente para el modal de confirmación (Estilo Bottom Sheet en móvil)
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

// Componente para el modal de compartir ítems (Estilo Bottom Sheet en móvil)
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
                  <option key={String(product.id)} value={product.id}>
                    {product.name} (${Number(product.price).toLocaleString('de-DE')}) (Disp: {Number(product.quantity)})
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
                  <div key={String(comensal.id)}
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

// Componente para el modal de resumen
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
                <span>${diner.totalSinPropina.toLocaleString('de-DE')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Propina (10%):</span>
                <span>${diner.propina.toLocaleString('de-DE')}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-200">
                <span>TOTAL A PAGAR:</span>
                <span>${diner.totalConPropina.toLocaleString('de-DE')}</span>
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


// --- Componente principal de la aplicación ---
const App = () => {
    // --- ESTADOS ---
    const [currentStep, setCurrentStep] = useState('loading'); // 'loading', 'reviewing', 'assigning', 'summary'
    
    // Estados originales
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
    
    // Estados de modales
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isRemoveInventoryItemModalOpen, setIsRemoveInventoryItemModalOpen] = useState(false);
    const [isClearComensalModalOpen, setIsClearComensalModalOpen] = useState(false);
    const [comensalToClearId, setComensalToClearId] = useState(null);
    const [isRemoveComensalModalOpen, setIsRemoveComensalModalOpen] = useState(false);
    const [comensalToRemoveId, setComensalToRemoveId] = useState(null);
    const [isClearAllComensalesModalOpen, setIsClearAllComensalesModalOpen] = useState(false);
    const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [summaryData, setSummaryData] = useState([]);
    
    // Estados de procesamiento de imagen
    const [isImageProcessing, setIsImageProcessing] = useState(false);
    const [imageProcessingError, setImageProcessingError] = useState(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
    
    // Otros estados y refs
    const [activeSharedInstances, setActiveSharedInstances] = useState(new Map());
    const hasPendingChanges = useRef(false);
    const initialLoadDone = useRef(false);
    const isLoadingFromServer = useRef(false);
    const justCreatedSessionId = useRef(null);
    const MAX_COMENSALES = 20;

    // --- LÓGICA DE NEGOCIO (Sin cambios) ---
    const saveStateToGoogleSheets = useCallback(async (currentShareId, dataToSave) => {
        if (GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE") || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
          return Promise.reject(new Error("URL de Apps Script inválida."));
        }
        if (!currentShareId || !userId) return Promise.resolve();
    
        const promiseWithTimeout = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('El guardado ha tardado demasiado y fue cancelado (timeout).'));
            }, 8000);
    
            const callbackName = 'jsonp_callback_save_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
    
            const cleanup = () => {
                clearTimeout(timeoutId);
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                delete window[callbackName];
            };
    
            window[callbackName] = (data) => {
                cleanup();
                resolve(data);
            };
    
            script.onerror = () => {
                cleanup();
                reject(new Error('Error de red al guardar los datos en Google Sheets.'));
            };
    
            const dataString = JSON.stringify(dataToSave);
            const encodedData = encodeURIComponent(dataString);
            script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=save&id=${currentShareId}&data=${encodedData}&callback=${callbackName}`;
            document.body.appendChild(script);
        });
    
        try {
          const result = await promiseWithTimeout;
          if (result.status === 'error') {
            return Promise.reject(new Error(result.message));
          }
          return Promise.resolve();
        } catch (error) {
          return Promise.reject(error);
        }
    }, [userId]);

    const handleResetAll = useCallback((isLocalOnly = false) => {
        if (!isLocalOnly) {
          setIsResetAllModalOpen(true);
        } else {
          setAvailableProducts(new Map());
          setComensales([]);
          setActiveSharedInstances(new Map());
          setShareId(`local-session-${Date.now()}`);
          setShareLink('');
          setCurrentStep('loading');
          
          // **LÍNEAS AÑADIDAS PARA LIMPIAR LA URL**
          const url = new URL(window.location.href);
          url.searchParams.delete('id');
          window.history.replaceState({}, document.title, url.toString());
        }
    }, []);

    const loadStateFromGoogleSheets = useCallback(async (idToLoad) => {
        if (GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE") || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) return;
        if (!idToLoad || idToLoad.startsWith('local-')) return;
    
        const callbackName = 'jsonp_callback_load_' + Math.round(100000 * Math.random());
        const promise = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          window[callbackName] = (data) => {
            if(document.body.contains(script)) document.body.removeChild(script);
            delete window[callbackName];
            resolve(data);
          };
          script.onerror = () => {
            if(document.body.contains(script)) document.body.removeChild(script);
            delete window[callbackName];
            reject(new Error('Error al cargar los datos desde Google Sheets.'));
          };
          script.src = `${GOOGLE_SHEET_WEB_APP_URL}?action=load&id=${idToLoad}&callback=${callbackName}`;
          document.body.appendChild(script);
        });
    
        try {
          const data = await promise;
          if (data && data.status !== "not_found") {
            if (hasPendingChanges.current) return;
            
            isLoadingFromServer.current = true;
    
            const loadedProducts = new Map(
              Object.entries(data.availableProducts || {}).map(([key, value]) => [Number(key), value])
            );
            const loadedSharedInstances = new Map(
              Object.entries(data.activeSharedInstances || {}).map(([key, value]) => [Number(key), new Set(value)])
            );
    
            setComensales(data.comensales || []);
            setAvailableProducts(loadedProducts);
            setActiveSharedInstances(loadedSharedInstances);
            // **NUEVO**: Si se cargan datos, se asume que ya se verificaron, pasar a asignar
            if (loadedProducts.size > 0 || (data.comensales && data.comensales.length > 0)) {
                setCurrentStep('assigning');
            }
    
          } else {
            if (idToLoad === justCreatedSessionId.current) {
              console.warn("La sesión recién creada aún no está disponible para lectura. Reintentando en el próximo ciclo.");
              return; 
            }
    
            alert("La sesión compartida no fue encontrada. Se ha iniciado una nueva sesión local.");
            const url = new URL(window.location.href);
            url.searchParams.delete('id');
            window.history.replaceState({}, document.title, url.toString());
            handleResetAll(true);
          }
        } catch (error) {
          console.error("Error al cargar con JSONP:", error);
        } finally {
          setTimeout(() => {
            isLoadingFromServer.current = false;
          }, 0);
        }
    }, [handleResetAll]);

    const deleteStateFromGoogleSheets = useCallback(async (idToDelete) => {
        if (GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE") || !GOOGLE_SHEET_WEB_APP_URL.startsWith("https://script.google.com/macros/")) return;
        if (!idToDelete) return;
    
        const callbackName = 'jsonp_callback_delete_' + Math.round(100000 * Math.random());
        const promise = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          window[callbackName] = (data) => {
            if(document.body.contains(script)) document.body.removeChild(script);
            delete window[callbackName];
            resolve(data);
          };
          script.onerror = () => {
            if(document.body.contains(script)) document.body.removeChild(script);
            delete window[callbackName];
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

    useEffect(() => {
        const uniqueSessionUserId = localStorage.getItem('billSplitterUserId');
        if (uniqueSessionUserId) setUserId(uniqueSessionUserId);
        else {
          const newUniqueId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('billSplitterUserId', newUniqueId);
          setUserId(newUniqueId);
        }
        setAuthReady(true);
    }, []);

    useEffect(() => {
        const performInitialLoad = async () => {
            if (!authReady || !userId || initialLoadDone.current) return;
    
            const urlParams = new URLSearchParams(window.location.search);
            const idFromUrl = urlParams.get('id');
    
            if (idFromUrl) {
                setShareId(idFromUrl);
                await loadStateFromGoogleSheets(idFromUrl);
            } else {
                setShareId(`local-session-${Date.now()}`);
            }
            
            initialLoadDone.current = true;
        };
    
        performInitialLoad();
    }, [authReady, userId, loadStateFromGoogleSheets]);

    useEffect(() => {
        const isAnyModalOpen = isShareModalOpen || isRemoveInventoryItemModalOpen || isClearComensalModalOpen || isRemoveComensalModalOpen || isClearAllComensalesModalOpen || isResetAllModalOpen || isSummaryModalOpen;
        
        if (!shareId || shareId.startsWith('local-') || !userId || isAnyModalOpen || GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE")) {
          return;
        }
    
        let isCancelled = false;
        const pollTimeout = 5000;
        let pollTimer;
    
        const poll = () => {
          if (isCancelled) {
            return;
          }
    
          if (!hasPendingChanges.current) {
            loadStateFromGoogleSheets(shareId).finally(() => {
              if (!isCancelled) {
                pollTimer = setTimeout(poll, pollTimeout);
              }
            });
          } else {
            if (!isCancelled) {
              pollTimer = setTimeout(poll, pollTimeout);
            }
          }
        };
    
        pollTimer = setTimeout(poll, pollTimeout);
    
        return () => {
          isCancelled = true;
          clearTimeout(pollTimer);
        };
    }, [shareId, userId, loadStateFromGoogleSheets, isShareModalOpen, isRemoveInventoryItemModalOpen, isClearComensalModalOpen, isRemoveComensalModalOpen, isClearAllComensalesModalOpen, isResetAllModalOpen, isSummaryModalOpen]);
    
    useEffect(() => {
        if (isLoadingFromServer.current) {
            return;
        }
        
        if (!initialLoadDone.current || !shareId || shareId.startsWith('local-') || !authReady || isImageProcessing) return;
    
        hasPendingChanges.current = true;
        const handler = setTimeout(() => {
          const dataToSave = {
              comensales,
              availableProducts: Object.fromEntries(availableProducts),
              activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])),
              lastUpdated: new Date().toISOString()
          };
          saveStateToGoogleSheets(shareId, dataToSave)
            .catch((e) => {
              console.error("El guardado falló:", e.message);
              alert(`No se pudieron guardar los últimos cambios: ${e.message}`);
            })
            .finally(() => {
              hasPendingChanges.current = false;
            });
        }, 1000);
        return () => clearTimeout(handler);
    }, [comensales, availableProducts, activeSharedInstances, shareId, saveStateToGoogleSheets, authReady, isImageProcessing]);

    const handleAddItem = (comensalId, productId) => {
        const productInStock = availableProducts.get(productId);
        if (!productInStock || Number(productInStock.quantity) <= 0) {
          console.error(`Producto con ID ${productId} no encontrado o sin stock. El inventario puede tener claves de tipo incorrecto.`);
          return;
        }
    
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
                ...productInStock, price: priceWithTip, originalBasePrice: Number(productInStock.price), quantity: 1, type: 'full',
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
            const newComensales = comensales.map(c => {
                if (c.id === comensalId) {
                    const updatedItems = [...c.selectedItems];
                    const itemInBill = updatedItems[itemIndex];
                    if (itemInBill.quantity > 1) {
                        updatedItems[itemIndex] = { ...itemInBill, quantity: itemInBill.quantity - 1 };
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
                if (product) newProducts.set(itemToRemove.id, { ...product, quantity: product.quantity + 1 });
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
                    if (product) newProducts.set(originalProductId, { ...product, quantity: product.quantity + 1 });
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
                            return { ...item, price: newPriceWithTipPerShare, originalBasePrice: newBasePricePerShare, sharedByCount: newSharerCount };
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
            const updatedItems = [...comensal.selectedItems, {
                id: productToShare.id, name: productToShare.name, price: priceWithTipPerShare,
                originalBasePrice: basePricePerShare, quantity: 1, type: 'shared',
                sharedByCount: Number(sharingComensalIds.length), shareInstanceId: shareInstanceId
            }];
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
    
        const newComensalId = comensales.length > 0 ? Math.max(0, ...comensales.map(c => c.id)) + 1 : 1;
        const newComensal = { id: newComensalId, name: newComensalName.trim(), selectedItems: [], total: 0 };
        setComensales(prevComensales => [...prevComensales, newComensal]);
        setNewComensalName('');
        setAddComensalMessage({ type: 'success', text: `¡Comensal "${newComensal.name}" añadido con éxito!` });
        setTimeout(() => setAddComensalMessage({ type: '', text: '' }), 3000);
    };

    const confirmClearComensal = () => {
        setIsClearComensalModalOpen(false);
        const comensalToClear = comensales.find(c => c.id === comensalToClearId);
        if (!comensalToClear) {
          setComensalToClearId(null);
          return;
        }
    
        const itemsToRemove = [...comensalToClear.selectedItems];
        itemsToRemove.forEach(item => {
            handleRemoveItem(comensalToClear.id, item.type === 'shared' ? item.shareInstanceId : item.id);
        });
    
        setComensales(prev => prev.map(c => c.id === comensalToClearId ? { ...c, selectedItems: [], total: 0 } : c));
        setComensalToClearId(null);
    };
    
    const openClearComensalModal = (comensalId) => {
        setComensalToClearId(comensalId);
        setIsClearComensalModalOpen(true);
    };

    const confirmRemoveComensal = () => {
        const idToRemove = comensalToRemoveId;
        if (idToRemove === null) return;
    
        const comensalToRemoveData = comensales.find(c => c.id === idToRemove);
        if (comensalToRemoveData) {
          const itemsToRemove = [...comensalToRemoveData.selectedItems];
          itemsToRemove.forEach(item => {
            const identifier = item.type === 'shared' ? item.shareInstanceId : item.id;
            handleRemoveItem(idToRemove, identifier);
          });
        }
    
        setComensales(prev => prev.filter(c => c.id !== idToRemove));
        setIsRemoveComensalModalOpen(false);
        setComensalToRemoveId(null);
    };
    
    const openRemoveComensalModal = (comensalId) => {
        setComensalToRemoveId(comensalId);
        setIsRemoveComensalModalOpen(true);
    };

    const confirmClearAllComensales = () => {
        if (comensales.length === 0) {
          setIsClearAllComensalesModalOpen(false);
          return;
        }
    
        const newProducts = new Map(availableProducts);
        const processedInstances = new Set();
    
        comensales.forEach(c => {
            c.selectedItems.forEach(item => {
                const product = newProducts.get(item.id);
                if (product) {
                    if (item.type === 'full') {
                        newProducts.set(item.id, { ...product, quantity: product.quantity + item.quantity });
                    } else if (item.type === 'shared' && !processedInstances.has(item.shareInstanceId)) {
                        newProducts.set(item.id, { ...product, quantity: product.quantity + 1 });
                        processedInstances.add(item.shareInstanceId);
                    }
                }
            });
        });
    
        setAvailableProducts(newProducts);
        setComensales([]);
        setActiveSharedInstances(new Map());
        setIsClearAllComensalesModalOpen(false);
    };
    
    const openClearAllComensalesModal = () => setIsClearAllComensalesModalOpen(true);
    
    const confirmResetAll = async () => {
        setIsResetAllModalOpen(false);
        if (shareId && userId && !shareId.startsWith('local-')) {
          await deleteStateFromGoogleSheets(shareId);
        }
        handleResetAll(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('id');
        window.history.replaceState({}, document.title, url.toString());
    };
    
    const openResetAllModal = () => setIsResetAllModalOpen(true);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
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
    };

    const analyzeImageWithGemini = async (base64ImageData, mimeType) => {
        try {
            const prompt = `Analiza la imagen de recibo adjunta, que está en formato chileno. INSTRUCCIONES IMPORTANTES PARA LEER NÚMEROS: En el recibo, el punto (.) es un separador de miles y la coma (,) es el separador decimal. Al extraer un precio como "1.234,50", debes interpretarlo como el número 1234.50. Ignora los puntos de miles. Extrae todos los ítems individuales, sus cantidades y sus precios base. Proporciona la salida como un objeto JSON con la propiedad "items", que es un array de objetos, cada uno con "name", "quantity" y "price". El "price" en el JSON final NO debe tener separadores de miles y DEBE usar un punto (.) como separador decimal. Ejemplo: Si en el recibo ves "2 x Cerveza Escudo" por un total de "7.980", el precio unitario es 3990. Tu salida para ese ítem debe ser: {"name": "Cerveza Escudo", "quantity": 2, "price": 3990}`;
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64ImageData } }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: { type: "OBJECT", properties: { "items": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "name": { "type": "STRING" }, "quantity": { "type": "INTEGER" }, "price": { "type": "NUMBER" } }, "required": ["name", "quantity", "price"] } } }, required: ["items"] }
                }
            };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyDMhW9Fxz2kLG7HszVnBDmgQMJwzXSzd9U";
            if (apiKey.includes("YOUR_GEMINI_API_KEY_HERE")) throw new Error("Falta la clave de API de Gemini.");
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
    
            if (result.candidates && result.candidates[0].content.parts[0].text) {
                const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
                
                // Limpiar estado anterior antes de cargar nuevos productos
                setComensales([]);
                setActiveSharedInstances(new Map());

                const newProductsMap = new Map();
                let currentMaxId = 0;
                (parsedData.items || []).forEach(item => {
                    const name = item.name.trim();
                    const price = parseFloat(item.price);
                    const quantity = parseInt(item.quantity);
                    if (name && !isNaN(price) && !isNaN(quantity) && quantity > 0) {
                        const existing = Array.from(newProductsMap.values()).find(p => p.name === name && p.price === price);
                        if (existing) {
                            newProductsMap.set(existing.id, { ...existing, quantity: existing.quantity + quantity });
                        } else {
                            currentMaxId++;
                            newProductsMap.set(currentMaxId, { id: currentMaxId, name, price, quantity });
                        }
                    }
                });
                setAvailableProducts(newProductsMap);
                // **NUEVO**: Avanzar al paso de revisión
                setCurrentStep('reviewing');
            } else {
                throw new Error("No se pudo extraer información de la imagen.");
            }
        } catch (error) {
            console.error("Error al analizar la imagen:", error);
            setImageProcessingError(error.message);
        } finally {
            setIsImageProcessing(false);
        }
    };
    
    const handleManualAddItem = () => {
        if (!manualItemName.trim() || isNaN(parseFloat(manualItemPrice)) || isNaN(parseInt(manualItemQuantity))) {
            setManualItemMessage({ type: 'error', text: 'Por favor, completa todos los campos correctamente.' });
            setTimeout(() => setManualItemMessage({ type: '', text: '' }), 3000);
            return;
        }
        const price = parseFloat(manualItemPrice);
        const quantity = parseInt(manualItemQuantity);
        setAvailableProducts(prevMap => {
            const newMap = new Map(prevMap);
            const name = manualItemName.trim();
            const existing = Array.from(newMap.values()).find(p => p.name === name && p.price === price);
            if (existing) {
                newMap.set(existing.id, { ...existing, quantity: existing.quantity + quantity });
            } else {
                const newId = newMap.size > 0 ? Math.max(0, ...newMap.keys()) + 1 : 1;
                newMap.set(newId, { id: newId, name, price, quantity });
            }
            return newMap;
        });
        setManualItemName('');
        setManualItemPrice('');
        setManualItemQuantity('');
        setManualItemMessage({ type: 'success', text: 'Ítem añadido.'});
        setTimeout(() => setManualItemMessage({type: '', text: ''}), 3000);
    };

    const handleRemoveInventoryItem = () => {
        if (!itemToRemoveFromInventoryId) {
            setRemoveInventoryItemMessage({ type: 'error', text: 'Por favor, selecciona un ítem.'});
            setTimeout(() => setRemoveInventoryItemMessage({type:'', text:''}), 3000);
            return;
        }
        setIsRemoveInventoryItemModalOpen(true);
    };
    
    const confirmRemoveInventoryItem = () => {
        const itemIdToDelete = parseInt(itemToRemoveFromInventoryId);
        if(isNaN(itemIdToDelete)) return;
        setAvailableProducts(prev => {
            const newMap = new Map(prev);
            newMap.delete(itemIdToDelete);
            return newMap;
        });
        const newComensales = comensales.map(comensal => {
            const newSelectedItems = comensal.selectedItems.filter(item => item.id !== itemIdToDelete);
            if (newSelectedItems.length < comensal.selectedItems.length) {
                const newTotal = newSelectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return { ...comensal, selectedItems: newSelectedItems, total: newTotal };
            }
            return comensal;
        });
        setComensales(newComensales);
        setIsRemoveInventoryItemModalOpen(false);
        setItemToRemoveFromInventoryId('');
    };

    const handleGenerateShareLink = async () => {
        if (!userId) {
          alert("La sesión no está lista. Intenta de nuevo en un momento.");
          return;
        }
    
        const newShareId = `session_${Date.now()}`;
        justCreatedSessionId.current = newShareId;
    
        const dataToSave = {
          comensales,
          availableProducts: Object.fromEntries(availableProducts),
          activeSharedInstances: Object.fromEntries(Array.from(activeSharedInstances.entries()).map(([key, value]) => [key, Array.from(value)])),
        };
    
        try {
          await saveStateToGoogleSheets(newShareId, dataToSave);
          const fullLink = `${window.location.origin}${window.location.pathname}?id=${newShareId}`;
    
          setShareId(newShareId);
          setShareLink(fullLink);
          window.history.pushState({ path: fullLink }, '', fullLink);
    
          navigator.clipboard.writeText(fullLink).then(() => alert('¡Enlace para compartir copiado al portapapeles!'));
          
          setTimeout(() => {
            if (justCreatedSessionId.current === newShareId) {
              justCreatedSessionId.current = null;
            }
          }, 10000);
    
        } catch (e) {
          alert(`Error al generar enlace: ${e.message}`);
          justCreatedSessionId.current = null;
        }
    };

    const handleOpenSummaryModal = () => {
        const data = comensales.map(comensal => {
          const totalConPropina = comensal.total || 0;
          const totalSinPropina = comensal.selectedItems.reduce((sum, item) => sum + ((item.originalBasePrice || 0) * (item.quantity || 0)), 0);
          const propina = totalConPropina - totalSinPropina;
          return {
            id: comensal.id,
            name: comensal.name,
            totalSinPropina: Math.round(totalSinPropina),
            propina: Math.round(propina),
            totalConPropina: Math.round(totalConPropina),
          };
        });
        setSummaryData(data);
        setIsSummaryModalOpen(true);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('print-source-content');
        if (!printContent) {
            console.error('Elemento para imprimir no encontrado.');
            return;
        }
    
        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (!printWindow) {
            alert('Por favor, permite las ventanas emergentes para poder imprimir.');
            return;
        }
        
        printWindow.document.write('<html><head><title>Resumen de Cuenta</title>');
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        printWindow.document.write('</head><body class="p-8">');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
    
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };
    
    // --- RENDERIZADO CONDICIONAL POR PASOS ---
    const renderStep = () => {
        switch (currentStep) {
          case 'loading':
            return (
              <LoadingStep
                onImageUpload={handleImageUpload}
                onManualEntry={() => setCurrentStep('reviewing')}
                isImageProcessing={isImageProcessing}
                imageProcessingError={imageProcessingError}
              />
            );
          case 'reviewing':
            return (
                <ReviewStep
                    initialProducts={availableProducts}
                    onConfirm={(finalProducts) => {
                        setAvailableProducts(finalProducts);
                        setCurrentStep('assigning');
                    }}
                    onBack={() => {
                        handleResetAll(true);
                        setCurrentStep('loading');
                    }}
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
                onGoBack={() => setCurrentStep('reviewing')}
                onGenerateLink={handleGenerateShareLink}
                onRestart={() => handleResetAll(true)}
                shareLink={shareLink}
              />
            );
          default:
            return <p>Cargando...</p>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
          <div className="max-w-4xl mx-auto p-4">
              {renderStep()}
          </div>
  
          {/* Modales y elementos ocultos */}
          <div style={{ display: 'none' }}>
            <div id="print-source-content">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Resumen de la Cuenta</h2>
                <div className="space-y-6">
                    {summaryData.map(diner => (
                        <div key={diner.id} className="border-b border-dashed border-gray-300 pb-4 last:border-b-0" style={{ pageBreakInside: 'avoid' }}>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">{diner.name}</h3>
                            <div className="flex justify-between text-gray-600">
                                <span>Consumo (sin propina):</span>
                                <span>${diner.totalSinPropina.toLocaleString('de-DE')}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Propina (10%):</span>
                                <span>${diner.propina.toLocaleString('de-DE')}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-200">
                                <span>TOTAL A PAGAR:</span>
                                <span>${diner.totalConPropina.toLocaleString('de-DE')}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Nueva sección de totales en el PDF */}
                <div className="mt-8 pt-6 border-t-2 border-solid border-gray-800">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">TOTAL GENERAL</h3>
                     <div className="flex justify-between text-lg text-gray-700">
                        <span>Total General (sin propina):</span>
                        <span>${summaryData.reduce((sum, d) => sum + d.totalSinPropina, 0).toLocaleString('de-DE')}</span>
                    </div>
                     <div className="flex justify-between text-lg text-gray-700">
                        <span>Total Propina:</span>
                        <span>${summaryData.reduce((sum, d) => sum + d.propina, 0).toLocaleString('de-DE')}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-300">
                        <span>GRAN TOTAL A PAGAR:</span>
                        <span>${summaryData.reduce((sum, d) => sum + d.totalConPropina, 0).toLocaleString('de-DE')}</span>
                    </div>
                </div>
            </div>
          </div>
  
          <SummaryModal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} summaryData={summaryData} onPrint={handlePrint} />
          <ConfirmationModal isOpen={isClearComensalModalOpen} onClose={() => setIsClearComensalModalOpen(false)} onConfirm={confirmClearComensal} message="¿Estás seguro de que deseas limpiar todo el consumo para este comensal?" confirmText="Limpiar Consumo" />
          <ConfirmationModal isOpen={isRemoveComensalModalOpen} onClose={() => setIsRemoveComensalModalOpen(false)} onConfirm={confirmRemoveComensal} message="¿Estás seguro de que deseas eliminar este comensal?" confirmText="Eliminar Comensal" />
          <ConfirmationModal isOpen={isClearAllComensalesModalOpen} onClose={() => setIsClearAllComensalesModalOpen(false)} onConfirm={confirmClearAllComensales} message="¿Estás seguro de que deseas eliminar a TODOS los comensales?" confirmText="Eliminar Todos" />
          <ConfirmationModal isOpen={isResetAllModalOpen} onClose={() => setIsResetAllModalOpen(false)} onConfirm={confirmResetAll} message="¿Estás seguro de que deseas resetear toda la aplicación?" confirmText="Sí, Resetear Todo" cancelText="Cancelar" />
          <ShareItemModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} availableProducts={availableProducts} comensales={comensales} onShareConfirm={handleShareItem} />
          <ConfirmationModal isOpen={isRemoveInventoryItemModalOpen} onClose={() => setIsRemoveInventoryItemModalOpen(false)} onConfirm={confirmRemoveInventoryItem} message={`¿Estás seguro de que quieres eliminar "${availableProducts.get(Number(itemToRemoveFromInventoryId))?.name || 'este ítem'}" del inventario?`} confirmText="Sí, Eliminar" cancelText="No, Mantener" />
      </div>
    );
};

// --- COMPONENTES DE PASOS ---

const LoadingStep = ({ onImageUpload, onManualEntry, isImageProcessing, imageProcessingError }) => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
        <header className="mb-12">
            <h1 className="text-4xl font-extrabold text-blue-700 mb-2">Calculadora de Cuentas</h1>
            <p className="text-lg text-gray-600">Para empezar, carga los ítems de la cuenta.</p>
        </header>
        <div className="w-full max-w-sm space-y-5">
            <label htmlFor="file-upload" className={`w-full flex flex-col items-center px-6 py-8 bg-blue-600 text-white rounded-xl shadow-lg tracking-wide uppercase border border-blue-600 cursor-pointer hover:bg-blue-700 transition-all ${isImageProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <svg className="w-12 h-12 mb-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                </svg>
                <span className="text-lg font-semibold">Escanear Recibo</span>
                <span className="text-sm">Carga una foto</span>
                <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={onImageUpload} disabled={isImageProcessing} />
            </label>

            <button onClick={onManualEntry} disabled={isImageProcessing} className="w-full px-6 py-5 bg-white text-blue-600 font-semibold rounded-xl shadow-lg border border-gray-200 hover:bg-gray-100 transition-all disabled:opacity-50">
                Ingresar Manualmente
            </button>
        </div>
        {isImageProcessing && (
            <div className="mt-6 text-blue-600 font-semibold flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Procesando imagen...</span>
            </div>
        )}
        {imageProcessingError && <p className="mt-4 text-red-600">Error: {imageProcessingError}</p>}
    </div>
);

const ReviewStep = ({ initialProducts, onConfirm, onBack }) => {
    // **CORRECCIÓN DEFINITIVA**: El estado de los productos es local y se inicializa una sola vez.
    const [localProducts, setLocalProducts] = useState(() => new Map(initialProducts));
    const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' });

    const total = Array.from(localProducts.values()).reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
    const tip = total * 0.10;

    const handleProductChange = (id, field, value) => {
        setLocalProducts(prev => {
            const newMap = new Map(prev);
            const product = newMap.get(id);
            if (product) {
                newMap.set(id, { ...product, [field]: value });
            }
            return newMap;
        });
    };

    const handleRemoveProduct = (id) => {
        setLocalProducts(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    };

    const handleAddNewItem = () => {
        if (!newItem.name.trim() || isNaN(parseFloat(newItem.price)) || isNaN(parseInt(newItem.quantity))) {
            alert('Por favor, completa los campos del nuevo ítem correctamente.');
            return;
        }
        setLocalProducts(prev => {
            const newMap = new Map(prev);
            // Asegura un ID único incluso si se borran ítems
            const newId = (prev.size > 0 ? Math.max(0, ...Array.from(prev.keys())) : 0) + 1;
            newMap.set(newId, {
                id: newId,
                name: newItem.name.trim(),
                price: parseFloat(newItem.price),
                quantity: parseInt(newItem.quantity),
            });
            return newMap;
        });
        setNewItem({ name: '', price: '', quantity: '1' });
    };

    return (
        <div className="p-4">
            <header className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-blue-700">Revisa y Ajusta la Cuenta</h1>
                <p className="text-gray-600">Asegúrate que los ítems y precios coincidan con tu recibo.</p>
            </header>

            <div className="bg-white p-4 rounded-xl shadow-md mb-6 space-y-3">
                <h2 className="text-lg font-bold">Ítems Cargados</h2>
                {Array.from(localProducts.values()).map(p => (
                    <div key={p.id} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
                        <input type="text" value={p.name} onChange={e => handleProductChange(p.id, 'name', e.target.value)} className="col-span-5 p-2 border rounded-md" />
                        <input type="number" value={p.quantity} onChange={e => handleProductChange(p.id, 'quantity', e.target.value)} className="col-span-2 p-2 border rounded-md text-center" />
                        <span className="col-span-1 text-center self-center">$</span>
                        <input type="number" value={p.price} onChange={e => handleProductChange(p.id, 'price', e.target.value)} className="col-span-3 p-2 border rounded-md" />
                        <button onClick={() => handleRemoveProduct(p.id)} className="col-span-1 text-red-500 hover:text-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
                
                <div className="grid grid-cols-12 gap-2 items-center pt-3">
                     <input type="text" placeholder="Nombre ítem" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="col-span-5 p-2 border rounded-md" />
                     <input type="number" placeholder="Cant." value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="col-span-2 p-2 border rounded-md text-center" />
                     <span className="col-span-1 text-center self-center">$</span>
                     <input type="number" placeholder="Precio" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="col-span-3 p-2 border rounded-md" />
                     <button onClick={handleAddNewItem} className="col-span-1 text-white bg-green-500 hover:bg-green-600 rounded-full p-1 h-8 w-8 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                     </button>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl shadow-inner sticky bottom-4">
                <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-700">Subtotal:</span>
                    <span className="font-bold">${Math.round(total).toLocaleString('de-DE')}</span>
                </div>
                <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-700">Propina (10%):</span>
                    <span className="font-bold">${Math.round(tip).toLocaleString('de-DE')}</span>
                </div>
                <div className="flex justify-between text-2xl font-extrabold text-blue-800 mt-2 pt-2 border-t border-blue-200">
                    <span>TOTAL:</span>
                    <span>${Math.round(total + tip).toLocaleString('de-DE')}</span>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button onClick={onBack} className="w-full py-3 px-5 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300">
                    Volver y Empezar de Nuevo
                </button>
                <button onClick={() => onConfirm(localProducts)} className="w-full py-3 px-5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                    Todo Correcto, Continuar a Asignar
                </button>
            </div>
        </div>
    );
};

const AssigningStep = ({
    availableProducts, comensales, newComensalName, setNewComensalName, addComensalMessage, onAddComensal,
    onAddItem, onRemoveItem, onOpenClearComensalModal, onOpenRemoveComensalModal, onOpenShareModal, onOpenSummary,
    onGoBack, onGenerateLink, onRestart, shareLink
}) => {
    // Cálculo del monto pendiente (sin propina)
    const remainingToAssign = Array.from(availableProducts.values()).reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.quantity || 0)), 0);

    // Componente interno para la tarjeta de comensal (sin cambios)
    const ComensalCard = ({ comensal }) => {
        const totalSinPropina = comensal.selectedItems.reduce((sum, item) => sum + ((item.originalBasePrice || 0) * (item.quantity || 0)), 0);
        const propina = comensal.total - totalSinPropina;

        return (
            <div className="bg-white p-5 rounded-xl shadow-lg flex flex-col h-full">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{comensal.name}</h3>
                <div className="mb-4">
                    <label htmlFor={`product-select-${comensal.id}`} className="block text-sm font-medium text-gray-700 mb-1">Agregar Ítem:</label>
                    <select id={`product-select-${comensal.id}`} value="" onChange={(e) => onAddItem(comensal.id, parseInt(e.target.value, 10))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm">
                        <option value="" disabled>Selecciona un producto</option>
                        {Array.from(availableProducts.values()).filter(p => Number(p.quantity) > 0).map(product => (<option key={String(product.id)} value={product.id}>{product.name} (${Number(product.price).toLocaleString('de-DE')}) (Disp: {Number(product.quantity)})</option>))}
                    </select>
                </div>
                <div className="flex-grow min-h-[80px]">
                    {comensal.selectedItems.length > 0 ? (
                        <ul className="space-y-2 mb-4 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto">
                            {comensal.selectedItems.map((item, index) => (
                                <li key={`${item.id}-${item.shareInstanceId || index}`} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700">{item.type === 'shared' ? `1/${Number(item.sharedByCount)} x ${item.name}` : `${Number(item.quantity)} x ${item.name}`}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-900">${(Number(item.price) * Number(item.quantity)).toLocaleString('de-DE')}</span>
                                        <button onClick={() => onRemoveItem(comensal.id, item.type === 'shared' ? item.shareInstanceId : item.id)} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none" aria-label="Remove item">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (<p className="text-center text-gray-500 text-sm py-4">Aún no hay ítems.</p>)}
                </div>
                <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Total sin Propina:</span>
                        <span>${Math.round(totalSinPropina).toLocaleString('de-DE')}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Propina (10%):</span>
                        <span>${Math.round(propina).toLocaleString('de-DE')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold text-blue-700 mt-1">
                        <span>TOTAL A PAGAR:</span>
                        <span className="text-2xl">${Math.round(comensal.total).toLocaleString('de-DE')}</span>
                    </div>
                </div>
                 <div className="flex gap-2 mt-4">
                    <button onClick={() => onOpenClearComensalModal(comensal.id)} className="w-full bg-orange-100 text-orange-700 py-2 px-4 rounded-md shadow-sm hover:bg-orange-200 text-sm">Limpiar</button>
                    <button onClick={() => onOpenRemoveComensalModal(comensal.id)} className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-md shadow-sm hover:bg-red-200 text-sm">Eliminar</button>
                 </div>
            </div>
        )
    };
    
    return (
        // Se añade padding inferior para que el botón fijo no tape contenido
        <div className="pb-24">
            <header className="mb-6 text-center">
                <h1 className="text-3xl font-extrabold text-blue-700 mb-2">Asignar Consumos</h1>
                <p className="text-gray-600">Agrega comensales y asígnales lo que consumieron.</p>
                <button onClick={onGoBack} className="mt-2 text-sm text-blue-600 hover:underline">
                    &larr; Volver y Editar Ítems
                </button>
            </header>

            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md mb-6" role="alert">
                <p className="font-bold">Monto Pendiente de Asignar (sin propina):</p>
                <p className="text-2xl">${Math.round(remainingToAssign).toLocaleString('de-DE')}</p>
            </div>

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
                    <button onClick={onGenerateLink} className="w-full flex items-center justify-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <span className="font-semibold">Generar Link de Sesión</span>
                    </button>
                    <button onClick={onOpenShareModal} className="w-full flex items-center justify-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                        <span className="font-semibold">Compartir un Ítem</span>
                    </button>
                    <button onClick={onRestart} className="w-full flex items-center justify-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5" /><path d="M4 9a9 9 0 0114.65-4.65l-2.12 2.12a5 5 0 00-9.07 4.53" /><path d="M20 15a9 9 0 01-14.65 4.65l2.12-2.12a5 5 0 009.07-4.53" /></svg>
                        <span className="font-semibold">Empezar de Nuevo</span>
                    </button>
                </div>
                {shareLink && (
                    <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="font-semibold text-green-800">¡Enlace para compartir generado!</p>
                        <input type="text" readOnly value={shareLink} className="w-full mt-2 p-2 border rounded-md bg-white text-center text-sm" onFocus={(e) => e.target.select()} />
                        <button onClick={() => navigator.clipboard.writeText(shareLink).then(() => alert('¡Enlace copiado!'))} className="mt-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700">Copiar Enlace</button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comensales.map(comensal => (
                    <ComensalCard key={comensal.id} comensal={comensal} />
                ))}
            </div>

            {/* --- BOTÓN PRINCIPAL FIJO (MODIFICADO) --- */}
            {comensales.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200">
                     <button onClick={onOpenSummary} className="w-full max-w-4xl mx-auto py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-transform hover:scale-105 flex flex-col items-center">
                        <span className="text-lg">Ver Resumen Final</span>
                        {/* Se muestra el monto pendiente solo si es mayor a cero */}
                        {Math.round(remainingToAssign) > 0 && (
                             <span className="text-xs font-normal opacity-90">
                                Faltan ${Math.round(remainingToAssign).toLocaleString('de-DE')} por asignar
                             </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
};


export default App;
