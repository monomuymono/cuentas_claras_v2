import React, { useState, useEffect, useCallback, useRef } from 'react';

// Polyfill para 'process' si no está definido
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {} };
}

// URL de tu Google Apps Script Web App
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzI_sW6-SKJy8K3M1apb_hdmafjE9gz8ZF7UPrYKfeI5eBGDKmqagl6HLxnB0ILeY67JA/exec";

// --- Componentes de la Interfaz (Modales y Pasos) ---

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
                <span>Subtotal (con descuento):</span>
                <span>${diner.subtotalConDescuento.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Propina (10%):</span>
                <span>${diner.propina.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-200">
                <span>TOTAL A PAGAR:</span>
                <span>${diner.totalFinal.toLocaleString('es-CL')}</span>
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

// --- COMPONENTES DE PASOS ---

const LandingStep = ({ onStart }) => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
        <div className="mb-8">
            <svg className="w-24 h-24 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <h1 className="text-5xl font-extrabold text-gray-800">CuentasClaras</h1>
        <p className="text-lg text-gray-600 mt-4 max-w-md">
            Divide la cuenta de cualquier restaurante de forma fácil y rápida. Escanea el recibo y deja que nosotros hagamos el resto.
        </p>
        <button 
            onClick={onStart} 
            className="mt-12 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
        >
            Empezar
        </button>
    </div>
);

const LoadingStep = ({ onImageUpload, onManualEntry, isImageProcessing, imageProcessingError }) => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
        <header className="mb-12">
            <h1 className="text-4xl font-extrabold text-blue-700 mb-2">Cargar la Cuenta</h1>
            <p className="text-lg text-gray-600">¿Cómo quieres ingresar los ítems?</p>
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

// --- COMPONENTE ReviewStep ---
const ReviewStep = ({ initialProducts, onConfirm, onBack, discountPercentage, setDiscountPercentage, discountCap, setDiscountCap }) => {
    const [localProducts, setLocalProducts] = useState(() => new Map(initialProducts));
    const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' });

    useEffect(() => {
        setLocalProducts(new Map(initialProducts));
    }, [initialProducts]);
    
    const total = Array.from(localProducts.values()).reduce((sum, p) => {
        const price = parseFloat(p.price) || 0;
        const quantity = parseInt(p.quantity, 10) || 0;
        return sum + (price * quantity);
    }, 0);
    const tip = total * 0.10;

    const formatNumberInput = (value) => {
        if (!value) return '';
        const cleanedValue = String(value).replace(/\./g, '');
        if (isNaN(cleanedValue)) return value;
        return Number(cleanedValue).toLocaleString('es-CL');
    };

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
        const cleanedPrice = String(newItem.price).replace(/\./g, '');
        if (!newItem.name.trim() || isNaN(parseFloat(cleanedPrice)) || isNaN(parseInt(newItem.quantity, 10))) {
            alert('Por favor, completa los campos del nuevo ítem correctamente.');
            return;
        }
        setLocalProducts(prev => {
            const newMap = new Map(prev);
            const newId = (prev.size > 0 ? Math.max(0, ...Array.from(prev.keys())) : 0) + 1;
            newMap.set(newId, {
                id: newId,
                name: newItem.name.trim(),
                price: parseFloat(cleanedPrice),
                quantity: parseInt(newItem.quantity, 10),
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
                        <input
                            type="text"
                            value={p.name}
                            onChange={e => handleProductChange(p.id, 'name', e.target.value)}
                            className="col-span-5 p-2 border rounded-md"
                        />
                        <input
                            type="number"
                            value={p.quantity}
                            onChange={e => handleProductChange(p.id, 'quantity', e.target.value)}
                            className="col-span-2 p-2 border rounded-md text-center"
                        />
                        <span className="col-span-1 text-center self-center">$</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={formatNumberInput(p.price)}
                            onChange={e => handleProductChange(p.id, 'price', e.target.value.replace(/\./g, ''))}
                            className="col-span-3 p-2 border rounded-md"
                        />
                        <button
                            onClick={() => handleRemoveProduct(p.id)}
                            className="col-span-1 text-red-500 hover:text-red-700"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 mx-auto"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                ))}
                
                <div className="grid grid-cols-12 gap-2 items-center pt-3">
                    <input
                        type="text"
                        placeholder="Nombre ítem"
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        className="col-span-5 p-2 border rounded-md"
                    />
                    <input
                        type="number"
                        placeholder="Cant."
                        value={newItem.quantity}
                        onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                        className="col-span-2 p-2 border rounded-md text-center"
                    />
                    <span className="col-span-1 text-center self-center">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Precio"
                        value={formatNumberInput(newItem.price)}
                        onChange={e => setNewItem({...newItem, price: e.target.value.replace(/\./g, '')})}
                        className="col-span-3 p-2 border rounded-md"
                    />
                    <button
                        onClick={handleAddNewItem}
                        className="col-span-1 text-white bg-green-500 hover:bg-green-600 rounded-full p-1 h-8 w-8 flex items-center justify-center"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                <h2 className="text-lg font-bold mb-3">Aplicar Descuento</h2>
                <div className="grid grid-cols-2 gap-4">
                    <input
                        type="number"
                        placeholder="Descuento %"
                        value={discountPercentage}
                        onChange={e => setDiscountPercentage(e.target.value)}
                        className="p-2 border rounded-md"
                    />
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Tope Descuento $"
                        value={formatNumberInput(discountCap)}
                        onChange={e => setDiscountCap(e.target.value.replace(/\./g, ''))}
                        className="p-2 border rounded-md"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Nota: Ingresa los montos sin puntos de miles.
                </p>
            </div>

            {/* Summary Section - Moved to normal flow */}
            <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="bg-blue-50 p-4 rounded-xl shadow-inner mb-4">
                    <div className="flex justify-between text-lg">
                        <span className="font-semibold text-gray-700">Subtotal:</span>
                        <span className="font-bold">${total.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                        <span className="font-semibold text-gray-700">Propina (10%):</span>
                        <span className="font-bold">${Math.round(tip).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-extrabold text-blue-800 mt-2 pt-2 border-t border-blue-200">
                        <span>TOTAL:</span>
                        <span>${Math.round(total + tip).toLocaleString('es-CL')}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={onBack}
                        className="w-full py-3 px-5 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300"
                    >
                        Volver y Empezar de Nuevo
                    </button>
                    <button
                        onClick={() => onConfirm(localProducts)}
                        className="w-full py-3 px-5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
                    >
                        Todo Correcto, Continuar a Asignar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente principal de la aplicación ---
const App = () => {
    // --- ESTADOS ---
    const [currentStep, setCurrentStep] = useState('landing');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    
    // -- Estados para el descuento --
    const [discountPercentage, setDiscountPercentage] = useState('');
    const [discountCap, setDiscountCap] = useState('');
    
    // Estados originales
    const [userId, setUserId] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [shareId, setShareId] = useState(null);
    const [shareLink, setShareLink] = useState('');
    const [availableProducts, setAvailableProducts] = useState(new Map());
    const [comensales, setComensales] = useState([]);
    const [newComensalName, setNewComensalName] = useState('');
    const [addComensalMessage, setAddComensalMessage] = useState({ type: '', text: '' });
    
    // Estados de modales
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isClearComensalModalOpen, setIsClearComensalModalOpen] = useState(false);
    const [comensalToClearId, setComensalToClearId] = useState(null);
    const [isRemoveComensalModalOpen, setIsRemoveComensalModalOpen] = useState(false);
    const [comensalToRemoveId, setComensalToRemoveId] = useState(null);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [summaryData, setSummaryData] = useState([]);
    
    // Estados de procesamiento de imagen
    const [isImageProcessing, setIsImageProcessing] = useState(false);
    const [imageProcessingError, setImageProcessingError] = useState(null);
    
    // Otros estados y refs
    const [activeSharedInstances, setActiveSharedInstances] = useState(new Map());
    const hasPendingChanges = useRef(false);
    const initialLoadDone = useRef(false);
    const isLoadingFromServer = useRef(false);
    const justCreatedSessionId = useRef(null);
    const MAX_COMENSALES = 20;

    // --- LÓGICA DE NEGOCIO ---
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
        } else {
          setAvailableProducts(new Map());
          setComensales([]);
          setActiveSharedInstances(new Map());
          setShareId(`local-session-${Date.now()}`);
          setShareLink('');
          setDiscountPercentage('');
          setDiscountCap('');
          setCurrentStep('landing');
          
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
            if (loadedProducts.size > 0 || (data.comensales && data.comensales.length > 0)) {
                setCurrentStep('assigning');
            }
    
          } else {
            if (idToLoad === justCreatedSessionId.current) {
              console.warn("La sesión recién creada aún no está disponible para lectura.");
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
                setCurrentStep('loading');
                await loadStateFromGoogleSheets(idFromUrl);
            } else {
                setShareId(`local-session-${Date.now()}`);
            }
            
            initialLoadDone.current = true;
        };
    
        performInitialLoad();
    }, [authReady, userId, loadStateFromGoogleSheets]);

    useEffect(() => {
        const isAnyModalOpen = isShareModalOpen || isClearComensalModalOpen || isRemoveComensalModalOpen || isSummaryModalOpen;
        
        if (!shareId || shareId.startsWith('local-') || !userId || isAnyModalOpen || GOOGLE_SHEET_WEB_APP_URL.includes("YOUR_NEW_JSONP_WEB_APP_URL_HERE")) {
          return;
        }
    
        let isCancelled = false;
        const pollTimeout = 5000;
        let pollTimer;
    
        const poll = () => {
          if (isCancelled) { return; }
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
    }, [shareId, userId, loadStateFromGoogleSheets, isShareModalOpen, isClearComensalModalOpen, isRemoveComensalModalOpen, isSummaryModalOpen]);
    
    useEffect(() => {
        if (isLoadingFromServer.current) { return; }
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

    const getEffectiveDiscountRatio = useCallback(() => {
        const totalBillWithoutTip = Array.from(availableProducts.values()).reduce((sum, p) => sum + (p.price * p.quantity), 0);
        if (totalBillWithoutTip === 0 || !discountPercentage) return 0;
        
        const percentage = parseFloat(discountPercentage) || 0;
        const cap = parseFloat(String(discountCap).replace(/\./g, '')) || Infinity;

        const potentialDiscount = totalBillWithoutTip * (percentage / 100);
        const actualTotalDiscount = Math.min(potentialDiscount, cap);

        return actualTotalDiscount / totalBillWithoutTip;
    }, [availableProducts, discountPercentage, discountCap]);

    const handleAddItem = (comensalId, productId) => {
        const productInStock = availableProducts.get(productId);
        if (!productInStock || Number(productInStock.quantity) <= 0) {
          console.error(`Producto con ID ${productId} no encontrado o sin stock.`);
          return;
        }
    
        const newProductsMap = new Map(availableProducts);
        newProductsMap.set(productId, { ...productInStock, quantity: Number(productInStock.quantity) - 1 });
    
        const newComensales = comensales.map(comensal => {
          if (comensal.id === comensalId) {
            const updatedComensal = { ...comensal, selectedItems: [...comensal.selectedItems] };
            const effectiveDiscountRatio = getEffectiveDiscountRatio();
            const originalPrice = Number(productInStock.price);
            const discountedPrice = originalPrice * (1 - effectiveDiscountRatio);
            const tip = originalPrice * 0.10;
            const finalPrice = discountedPrice + tip;

            const existingItemIndex = updatedComensal.selectedItems.findIndex(item => item.id === productId && item.type === 'full');
    
            if (existingItemIndex !== -1) {
              updatedComensal.selectedItems[existingItemIndex].quantity += 1;
            } else {
              updatedComensal.selectedItems.push({
                ...productInStock, 
                price: finalPrice,
                originalBasePrice: originalPrice,
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
                    const effectiveDiscountRatio = getEffectiveDiscountRatio();
                    const originalItemPrice = itemToRemove.originalBasePrice * itemToRemove.sharedByCount;
                    
                    const newBasePricePerShare = originalItemPrice / newSharerCount;
                    const newDiscountedPricePerShare = newBasePricePerShare * (1 - effectiveDiscountRatio);
                    const newTipPerShare = newBasePricePerShare * 0.10;
                    const newFinalPricePerShare = newDiscountedPricePerShare + newTipPerShare;

                    const newSelectedItems = c.selectedItems.map(item => {
                        if (String(item.shareInstanceId) === String(shareInstanceId)) {
                            return { 
                                ...item, 
                                price: newFinalPricePerShare, 
                                originalBasePrice: newBasePricePerShare, 
                                sharedByCount: newSharerCount 
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
    
        const effectiveDiscountRatio = getEffectiveDiscountRatio();
        const originalPrice = Number(productToShare.price);
        
        const basePricePerShare = originalPrice / sharingComensalIds.length;
        const discountedPricePerShare = basePricePerShare * (1 - effectiveDiscountRatio);
        const tipPerShare = basePricePerShare * 0.10;
        const finalPricePerShare = discountedPricePerShare + tipPerShare;
    
        const newComensales = comensales.map(comensal => {
          if (sharingComensalIds.includes(comensal.id)) {
            const updatedItems = [...comensal.selectedItems, {
                id: productToShare.id, 
                name: productToShare.name, 
                price: finalPricePerShare,
                originalBasePrice: basePricePerShare, 
                quantity: 1, 
                type: 'shared',
                sharedByCount: sharingComensalIds.length, 
                shareInstanceId: shareInstanceId
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
          setAddComensalMessage({ type: 'error', text: 'Por favor, ingresa un nombre.' });
          return;
        }
        if (comensales.length >= MAX_COMENSALES) {
          setAddComensalMessage({ type: 'error', text: `Máximo ${MAX_COMENSALES} comensales.` });
          return;
        }
    
        const newComensalId = comensales.length > 0 ? Math.max(0, ...comensales.map(c => c.id)) + 1 : 1;
        const newComensal = { id: newComensalId, name: newComensalName.trim(), selectedItems: [], total: 0 };
        setComensales(prevComensales => [...prevComensales, newComensal]);
        setNewComensalName('');
        setAddComensalMessage({ type: 'success', text: `¡"${newComensal.name}" añadido!` });
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

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
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
        };
        reader.readAsDataURL(file);
    };

    const analyzeImageWithGemini = async (base64ImageData, mimeType) => {
        try {
            // -- PROMPT MEJORADO --
            const prompt = `Analiza la imagen de un recibo chileno. Extrae los ítems con su cantidad y precio unitario. IMPORTANTE: En Chile, el punto '.' es un separador de miles y la coma ',' es decimal. En tu respuesta JSON, la propiedad 'price' DEBE ser un NÚMERO ENTERO (integer) sin decimales, ignorando todos los puntos y comas. Por ejemplo, si un precio es '$3.500', el valor en el JSON debe ser el NÚMERO 3500.`;
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
                
                setComensales([]);
                setActiveSharedInstances(new Map());

                const newProductsMap = new Map();
                let currentMaxId = 0;
                (parsedData.items || []).forEach(item => {
                    const name = item.name.trim();
                    // -- PARSEO MÁS SEGURO --
                    const price = Number(item.price);
                    const quantity = Number(item.quantity);

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
    
    const handleGenerateShareLink = async () => {
        if (!userId) {
          alert("La sesión no está lista. Intenta de nuevo en un momento.");
          return;
        }
    
        setIsGeneratingLink(true);
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
          
          setTimeout(() => {
            if (justCreatedSessionId.current === newShareId) {
              justCreatedSessionId.current = null;
            }
          }, 10000);
    
        } catch (e) {
          alert(`Error al generar enlace: ${e.message}`);
          justCreatedSessionId.current = null;
        } finally {
          setIsGeneratingLink(false);
        }
    };

    const handleOpenSummaryModal = () => {
        const effectiveDiscountRatio = getEffectiveDiscountRatio();

        const data = comensales.map(comensal => {
            const totalSinPropinaOriginal = comensal.selectedItems.reduce((sum, item) => sum + (item.originalBasePrice * item.quantity), 0);
            const descuentoAplicado = totalSinPropinaOriginal * effectiveDiscountRatio;
            const subtotalConDescuento = totalSinPropinaOriginal - descuentoAplicado;
            const propina = totalSinPropinaOriginal * 0.10;
            const totalFinal = subtotalConDescuento + propina;

            return {
                id: comensal.id,
                name: comensal.name,
                subtotalConDescuento: Math.round(subtotalConDescuento),
                propina: Math.round(propina),
                totalFinal: Math.round(totalFinal),
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
          case 'landing':
            return <LandingStep onStart={() => setCurrentStep('loading')} />;
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
                    onBack={() => handleResetAll(true)}
                    discountPercentage={discountPercentage}
                    setDiscountPercentage={setDiscountPercentage}
                    discountCap={discountCap}
                    setDiscountCap={setDiscountCap}
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
                effectiveDiscountRatio={getEffectiveDiscountRatio()}
              />
            );
          default:
            return <p>Cargando...</p>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
          <LoadingModal isOpen={isGeneratingLink} message="Generando enlace..." />
          
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
                                <span>Subtotal (con descuento):</span>
                                <span>${diner.subtotalConDescuento.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Propina (10%):</span>
                                <span>${diner.propina.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-200">
                                <span>TOTAL A PAGAR:</span>
                                <span>${diner.totalFinal.toLocaleString('es-CL')}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 pt-6 border-t-2 border-solid border-gray-800">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">TOTAL GENERAL</h3>
                     <div className="flex justify-between text-lg text-gray-700">
                        <span>Total General (con descuento):</span>
                        <span>${summaryData.reduce((sum, d) => sum + d.subtotalConDescuento, 0).toLocaleString('es-CL')}</span>
                    </div>
                     <div className="flex justify-between text-lg text-gray-700">
                        <span>Total Propina:</span>
                        <span>${summaryData.reduce((sum, d) => sum + d.propina, 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-gray-800 mt-2 pt-2 border-t border-gray-300">
                        <span>GRAN TOTAL A PAGAR:</span>
                        <span>${summaryData.reduce((sum, d) => sum + d.totalFinal, 0).toLocaleString('es-CL')}</span>
                    </div>
                </div>
            </div>
          </div>
  
          <SummaryModal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} summaryData={summaryData} onPrint={handlePrint} />
          <ConfirmationModal isOpen={isClearComensalModalOpen} onClose={() => setIsClearComensalModalOpen(false)} onConfirm={confirmClearComensal} message="¿Estás seguro de que deseas limpiar todo el consumo para este comensal?" confirmText="Limpiar Consumo" />
          <ConfirmationModal isOpen={isRemoveComensalModalOpen} onClose={() => setIsRemoveComensalModalOpen(false)} onConfirm={confirmRemoveComensal} message="¿Estás seguro de que deseas eliminar este comensal?" confirmText="Eliminar Comensal" />
          <ShareItemModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} availableProducts={availableProducts} comensales={comensales} onShareConfirm={handleShareItem} />
      </div>
    );
};

export default App;
