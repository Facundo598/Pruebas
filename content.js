console.log("Extensión 'Solicitud Ambulatorio' iniciada.");

// ========================================================
// CASO 1: Captura de datos en la página de gestión (Tu Web)
// ========================================================
const esPaginaGestion = document.getElementById('barra-externa') || document.getElementById('tabla-consultas');

if (esPaginaGestion) {

    const guardarYEnviar = (datosAEnviar) => {
        datosAEnviar.intento_realizado = false;

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(datosAEnviar, () => {
                console.log("Datos guardados en storage correctamente:", datosAEnviar);
                window.open('https://micamsalud.com.ar/', '_blank');
            });
        } else {
            alert("Error: La extensión no está activa o necesita ser recargada en Chrome (F5 en la página).");
        }
    };

    // Escuchar clic en el botón MICAM
    document.getElementById('btn-iniciar-logueo')?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Botón MICAM cliqueado");

        const usuario = document.getElementById('ext-usuario')?.value || '';
        const pass = document.getElementById('ext-password')?.value || '';

        const datosAEnviar = {
            micam_user: usuario,
            micam_pass: pass,
            solicitud_activa: false
        };

        guardarYEnviar(datosAEnviar);
    });

    // Escuchar clic en botones 'btn-gestionar'
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('btn-gestionar')) {
            e.preventDefault();
            console.log("Botón gestionar cliqueado");

            const fila = e.target.closest('tr');
            const usuario = document.getElementById('ext-usuario')?.value || '';
            const pass = document.getElementById('ext-password')?.value || '';

            const datosAEnviar = {
                micam_user: usuario,
                micam_pass: pass,
                solicitud_activa: true,
                micam_orden: {
                    dni: fila.dataset.dni || '',
                    nombre: fila.dataset.nombre || '',
                    orden: fila.dataset.ordennombre || '',
                    precio: fila.dataset.precio || '',
                    prestador: fila.dataset.prestador || '',
                    pago: fila.dataset.metodopago || ''
                }
            };

            guardarYEnviar(datosAEnviar);
        }
    });
}

// ========================================================
// CASO 2: Procesos automáticos dentro de Micam Salud
// ========================================================
if (window.location.hostname.includes("micamsalud.com.ar")) {
    console.log("Escuchando página de Micam...");

    const checkInterval = setInterval(() => {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

        chrome.storage.local.get(['micam_user', 'micam_pass', 'intento_realizado', 'solicitud_activa', 'micam_orden'], (data) => {
            
            // ----------------------------------------------------
            // PASO A: Login en Micam (SE MANTIENE INTACTO)
            // ----------------------------------------------------
            if (!data.intento_realizado) {
                const campoUsuario = document.getElementById('user');
                const campoClave = document.getElementById('pass');
                const botonIngresar = document.getElementById('boton');

                if (campoUsuario && campoClave && botonIngresar) {
                    console.log("Inyectando credenciales en Micam...");
                    
                    chrome.storage.local.set({ intento_realizado: true });

                    campoUsuario.value = data.micam_user || '';
                    campoClave.value = data.micam_pass || '';

                    campoUsuario.dispatchEvent(new Event('input', { bubbles: true }));
                    campoClave.dispatchEvent(new Event('input', { bubbles: true }));

                    setTimeout(() => {
                        botonIngresar.click();
                    }, 300);
                    return;
                }
            }

            // ----------------------------------------------------
            // PASO B: Navegación al formulario de solicitud ambulatoria
            // ----------------------------------------------------
            if (data.solicitud_activa) {
                const botCargaAmb = document.querySelector('img[name="Image11"]') || 
                                    document.querySelector('img[src*="bot_carga_amb.jpg"]');

                if (botCargaAmb) {
                    console.log("Botón 'Carga Solicitud Ambulatoria' detectado. Realizando clic...");
                    botCargaAmb.click();
                }

                // ----------------------------------------------------
                // PASO C: Carga secuencial de datos en el formulario
                // ----------------------------------------------------
                const selectPrestador = document.getElementById('lst_prestador');

                if (selectPrestador && data.micam_orden) {
                    clearInterval(checkInterval); // Detenemos la búsqueda general para iniciar la secuencia
                    
                    const ordenActual = data.micam_orden;
                    console.log("Iniciando llenado de formulario para prestador:", ordenActual.prestador);

                    // 1. Selección del prestador
                    if (ordenActual.prestador && ordenActual.prestador.includes("CIRCULO MEDICO")) {
                        selectPrestador.value = "570";
                    } else {
                        selectPrestador.value = selectPrestador.options[1]?.value || '';
                    }

                    selectPrestador.dispatchEvent(new Event('change', { bubbles: true }));

                    const inputVisual = document.querySelector('.ui-autocomplete-input');
                    if (inputVisual) {
                        inputVisual.value = ordenActual.prestador || '';
                    }
                    
                    selectPrestador.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                    selectPrestador.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));

                    // Iniciar la cadena de carga de campos
                    ejecutarPasoDni(ordenActual);
                }
            } else {
                if (data.intento_realizado && !document.getElementById('user')) {
                    clearInterval(checkInterval);
                }
            }
        });
    }, 500);

    setTimeout(() => clearInterval(checkInterval), 15000);

    // ========================================================
    // BLOQUES DE CASCADA (CAMPOS DEL FORMULARIO)
    // ========================================================

    // BLOQUE 1: CARGAR DNI
    function ejecutarPasoDni(ordenActual) {
        const bucleDni = setInterval(() => {
            const inputDni = document.getElementById('txt_dni');
            if (inputDni && !inputDni.disabled) {
                clearInterval(bucleDni);

                const dniLimpio = (ordenActual.dni || '').trim();
                console.log("Bloque DNI -> Escribiendo:", dniLimpio);
                
                inputDni.focus();
                inputDni.value = dniLimpio;
                
                inputDni.dispatchEvent(new Event('input', { bubbles: true }));
                inputDni.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log("Bloque DNI -> Presionando ENTER");
                inputDni.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                inputDni.dispatchEvent(new KeyboardEvent('keypress', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                inputDni.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                
                setTimeout(ejecutarPasoMatricula, 1000); 
            }
        }, 300);
    }

    // BLOQUE 2: CARGAR MATRÍCULA
    function ejecutarPasoMatricula() {
        const inputMatricula = document.getElementById('txt_matricula');
        if (inputMatricula) {
            console.log("Bloque Matrícula -> Escribiendo '01'");
            inputMatricula.value = "01";
            inputMatricula.dispatchEvent(new Event('input', { bubbles: true }));
            inputMatricula.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log("Bloque Matrícula -> Presionando ENTER");
            inputMatricula.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
            inputMatricula.dispatchEvent(new KeyboardEvent('keypress', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
            inputMatricula.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
            
            setTimeout(ejecutarPasoFecha, 1000);
        }
    }

    // BLOQUE 3: CARGAR FECHA ACTUAL
    function ejecutarPasoFecha() {
        const inputFecha = document.getElementById('txt_fecha_presc');
        if (inputFecha) {
            const hoy = new Date();
            const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            
            console.log("Bloque Fecha -> Escribiendo fecha de hoy:", fechaFormateada);
            inputFecha.value = fechaFormateada;
            inputFecha.dispatchEvent(new Event('input', { bubbles: true }));
            inputFecha.dispatchEvent(new Event('change', { bubbles: true }));
            inputFecha.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));

            setTimeout(ejecutarPasoObservacion, 1000);
        }
    }

    // BLOQUE 4: CARGAR OBSERVACIONES
    function ejecutarPasoObservacion() {
        const txtObservacion = document.getElementById('txt_observacion');
        if (txtObservacion) {
            console.log("Bloque Observaciones -> Escribiendo: 'Orden de Consulta'");
            txtObservacion.value = "Orden de Consulta";
            txtObservacion.dispatchEvent(new Event('input', { bubbles: true }));
            txtObservacion.dispatchEvent(new Event('change', { bubbles: true }));
            
            chrome.storage.local.get(['micam_orden'], (data) => {
                setTimeout(() => ejecutarPasoCodigoPrac(data.micam_orden), 1000);
            });
        }
    }

    // BLOQUE 5: CONVERSIÓN Y CARGA DEL CÓDIGO DE PRÁCTICA
    function ejecutarPasoCodigoPrac(ordenActual) {
        const inputCodigo = document.getElementById('txt_cod_nomenclador');
        if (inputCodigo && ordenActual?.orden) {
            const nombrePractica = ordenActual.orden.replace(/\s+/g, ' ').trim().toUpperCase();
            let codigoNumerico = "";

            if (nombrePractica === "CONSULTA MEDICA") codigoNumerico = "420101";
            else if (nombrePractica === "CONSULTA MEDICA ESPECIALISTA") codigoNumerico = "425009";
            else if (nombrePractica === "CONSULTA POR GUARDIA") codigoNumerico = "420104";
            else if (nombrePractica === "CONSULTA OFTALMOLOGICA ADULTO") codigoNumerico = "420304";

            if (codigoNumerico) {
                console.log(`Bloque Código -> Matcheó '${nombrePractica}' con: ${codigoNumerico}`);
                inputCodigo.focus();
                inputCodigo.value = codigoNumerico;
                
                inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
                inputCodigo.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log("Bloque Código -> Presionando ENTER");
                inputCodigo.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                inputCodigo.dispatchEvent(new KeyboardEvent('keypress', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                inputCodigo.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                
                // Transición al paso de ingresar cantidad
                setTimeout(ejecutarPasoCantidad, 600);
            }
        }
    }

    // BLOQUE 6: CARGAR CANTIDAD Y AGREGAR PRÁCTICA
    function ejecutarPasoCantidad() {
        const bucleCantidad = setInterval(() => {
            const inputCantidad = document.getElementById('txt_cantidad');
            
            if (inputCantidad) {
                clearInterval(bucleCantidad);
                
                console.log("Bloque Cantidad -> Escribiendo '1'");
                inputCantidad.focus();
                inputCantidad.value = "1";
                
                // Disparar eventos de cambio de input
                inputCantidad.dispatchEvent(new Event('input', { bubbles: true }));
                inputCantidad.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log("Bloque Cantidad -> Presionando ENTER para agregar ítem");
                // El Enter activa automáticamente la función nativa js_util_onEnter de la página
                inputCantidad.dispatchEvent(new KeyboardEvent('keypress', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));

                // Liberar el estado de la extensión
                chrome.storage.local.set({ solicitud_activa: false });
                console.log("Flujo automatizado completo. Extensión liberada.");
            }
        }, 300);
    }
}