console.log("Extensión 'Solicitud Ambulatorio' activa en: " + window.location.href);

// ========================================================
// CASO 1: Captura de datos en tu página de gestión (GitHub Pages / Local)
// ========================================================
if (window.location.href.includes("facundo598.github.io") || window.location.href.includes("localhost") || window.location.protocol === "file:") {
    
    // 1. Botón superior "Iniciar Logueo" manual (solo logueo, no navega a ambulatorio)
    const botonDisparar = document.getElementById('btn-iniciar-logueo');
    if (botonDisparar) {
        botonDisparar.addEventListener('click', () => {
            const usuario = document.getElementById('ext-usuario').value;
            const pass = document.getElementById('ext-password').value;
            
            chrome.storage.local.set({ 
                micam_user: usuario, 
                micam_pass: pass, 
                solicitud_activa: false 
            }, () => {
                window.open('https://micamsalud.com.ar/', '_blank');
            });
        });
    }

    // 2. Botón "Copiar Datos" de la tabla
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('btn-copiar')) {
            e.preventDefault();
            
            const fila = e.target.closest('tr');
            const datosFila = {
                dni: fila.dataset.dni,
                nombre: fila.dataset.nombre,
                orden: fila.dataset.orden,
                precio: fila.dataset.precio,
                prestador: fila.dataset.prestador,
                pago: fila.dataset.pago
            };
            
            const usuario = document.getElementById('ext-usuario').value;
            const pass = document.getElementById('ext-password').value;
            
            // Guardamos TODO en el almacenamiento seguro de Chrome (Credenciales + Orden + Interruptor)
            chrome.storage.local.set({ 
                micam_user: usuario, 
                micam_pass: pass,
                micam_orden: datosFila,
                solicitud_activa: true // <-- Esto le avisa a la extensión que SÍ debe redirigir
            }, () => {
                console.log("Datos y credenciales transferidos a la extensión. Abriendo Micam Salud...");
                window.open('https://micamsalud.com.ar/', '_blank');
            });
        }
    });
}

// ========================================================
// CASO 2: Procesos automáticos dentro de Micam Salud
// ========================================================
if (window.location.href.includes("micamsalud.com.ar")) {

    // Traemos toda la configuración de la extensión
    chrome.storage.local.get(['micam_user', 'micam_pass', 'micam_orden', 'solicitud_activa'], (data) => {
        
        // ----------------------------------------------------
        // SUB-PASO A: LOGUEO AUTOMÁTICO (Solo si hay credenciales)
        // ----------------------------------------------------
        if (data.micam_user && data.micam_pass) {
            
            const rellenarFormulario = setInterval(() => {
                const campoUsuario = document.getElementById('user');
                const campoClave = document.getElementById('pass');
                const botonIngresar = document.getElementById('boton');

                if (campoUsuario && campoClave && botonIngresar) {
                    campoUsuario.value = data.micam_user; 
                    campoClave.value = data.micam_pass;

                    campoUsuario.dispatchEvent(new Event('input', { bubbles: true }));
                    campoUsuario.dispatchEvent(new Event('change', { bubbles: true }));
                    campoClave.dispatchEvent(new Event('input', { bubbles: true }));
                    campoClave.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    console.log("Logueando...");
                    botonIngresar.click();
                    
                    clearInterval(rellenarFormulario);
                }
                
                if (!document.getElementById('user')) {
                    clearInterval(rellenarFormulario);
                }
            }, 100);

            setTimeout(() => clearInterval(rellenarFormulario), 10000);
        }

        // CONTROL DE FLUJO: Si NO viniste desde el botón "Copiar Datos", la extensión se detiene acá.
        if (!data.solicitud_activa) {
            console.log("Navegación manual o independiente detectada. Extensión en modo pasivo.");
            return; 
        }

        // ----------------------------------------------------
        // SUB-PASO B: NAVEGACIÓN DEL MENÚ (Solo si solicitud_activa es true)
        // ----------------------------------------------------
        const navegarMenu = setInterval(() => {
            if (document.getElementById('lst_prestador') || document.getElementById('txt_dni')) {
                clearInterval(navegarMenu);
                return;
            }

            const menuAmbulatorio = document.querySelector('a[title="Ambulatorio"]');
            const enlaces = document.getElementsByTagName('a');
            let opcionCargarSolicitud = null;
            
            for (let i = 0; i < enlaces.length; i++) {
                if (enlaces[i].textContent.trim() === "Cargar Solicitud") {
                    opcionCargarSolicitud = enlaces[i];
                    break;
                }
            }

            if (menuAmbulatorio && opcionCargarSolicitud) {
                console.log("Redirigiendo a solicitud ambulatoria...");
                menuAmbulatorio.click(); 
                setTimeout(() => { opcionCargarSolicitud.click(); }, 150); 
                clearInterval(navegarMenu);
            }
        }, 300);

        // ----------------------------------------------------
        // SUB-PASO C: SELECCIÓN DEL PRESTADOR Y FLUJO PASO A PASO
        // ----------------------------------------------------
        const seleccionarPrestador = setInterval(() => {
            const selectPrestador = document.getElementById('lst_prestador');

            if (selectPrestador && data.micam_orden) {
                const ordenActual = data.micam_orden;
                clearInterval(seleccionarPrestador);
                console.log("Insertando prestador desde la extensión:", ordenActual.prestador);

                if (ordenActual.prestador.includes("CIRCULO MEDICO")) {
                    selectPrestador.value = "570";
                } else {
                    selectPrestador.value = selectPrestador.options[1]?.value;
                }

                selectPrestador.dispatchEvent(new Event('change', { bubbles: true }));

                const inputVisual = document.querySelector('.ui-autocomplete-input');
                if (inputVisual) {
                    inputVisual.value = ordenActual.prestador;
                }
                
                selectPrestador.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, bubbles: true }));
                selectPrestador.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, bubbles: true }));
                
                // Disparamos el primer bloque: Cargar DNI
                ejecutarPasoDni(ordenActual);
            }
        }, 300);

        // === BLOQUE 1: FUNCION PARA CARGAR EL DNI ===
        function ejecutarPasoDni(ordenActual) {
            const bucleDni = setInterval(() => {
                const inputDni = document.getElementById('txt_dni');
                if (inputDni && !inputDni.disabled) {
                    clearInterval(bucleDni);

                    // CORRECCIÓN CLAVE: .trim() elimina los espacios en blanco invisibles del final
                    const dniLimpio = ordenActual.dni.trim();
                    console.log("Bloque DNI -> Escribiendo limpio: " + dniLimpio);
                    
                    inputDni.focus(); // Hacemos foco físico en el input
                    inputDni.value = dniLimpio;
                    
                    inputDni.dispatchEvent(new Event('input', { bubbles: true }));
                    inputDni.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    console.log("Bloque DNI -> Presionando ENTER");
                    inputDni.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                    inputDni.dispatchEvent(new KeyboardEvent('keypress', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                    inputDni.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                    
                    // Al terminar con éxito el DNI, llamamos al bloque de la matrícula dándole 1 segundo de espera
                    setTimeout(ejecutarPasoMatricula, 1000); 
                }
            }, 300);
        }

        // === BLOQUE 2: FUNCION PARA CARGAR LA MATRÍCULA ===
        function ejecutarPasoMatricula() {
            const inputMatricula = document.getElementById('txt_matricula');
            if (inputMatricula) {
                console.log("Bloque Matrícula -> Escribiendo valor fijo '01'");
                inputMatricula.value = "01";
                inputMatricula.dispatchEvent(new Event('input', { bubbles: true }));
                inputMatricula.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log("Bloque Matrícula -> Presionando ENTER");
                inputMatricula.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                inputMatricula.dispatchEvent(new KeyboardEvent('keypress', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                inputMatricula.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                
                // Llamamos al paso de la fecha dando 1 segundo de espera
                setTimeout(ejecutarPasoFecha, 1000);
            }
        }

        // === BLOQUE 3: FUNCION PARA CARGAR LA FECHA ACTUAL ===
        function ejecutarPasoFecha() {
            const inputFecha = document.getElementById('txt_fecha_presc');
            if (inputFecha) {
                const hoy = new Date();
                const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
                
                console.log("Bloque Fecha -> Escribiendo fecha de hoy: " + fechaFormateada);
                inputFecha.value = fechaFormateada;
                inputFecha.dispatchEvent(new Event('input', { bubbles: true }));
                inputFecha.dispatchEvent(new Event('change', { bubbles: true }));
                inputFecha.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));

                // Llamamos a las observaciones dando 1 segundo de espera
                setTimeout(ejecutarPasoObservacion, 1000);
            }
        }

        // === BLOQUE 4: FUNCION PARA CARGAR LAS OBSERVACIONES ===
        function ejecutarPasoObservacion() {
            const txtObservacion = document.getElementById('txt_observacion');
            if (txtObservacion) {
                console.log("Bloque Observaciones -> Escribiendo: 'Orden de Consulta'");
                txtObservacion.value = "Orden de Consulta";
                txtObservacion.dispatchEvent(new Event('input', { bubbles: true }));
                txtObservacion.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Llamamos al paso del código de práctica dando 1 segundo de espera
                setTimeout(() => ejecutarPasoCodigoPrac(data.micam_orden), 1000);
            }
        }

        // === BLOQUE 5: CONVERSIÓN DE TEXTO A CÓDIGO NUMÉRICO Y CARGA ===
        function ejecutarPasoCodigoPrac(ordenActual) {
            const inputCodigo = document.getElementById('txt_cod_nomenclador');
            if (inputCodigo && ordenActual?.orden) {
                // Limpiamos el nombre que viene del Sheet por si quedó algún espacio raro
                const nombrePractica = ordenActual.orden.replace(/\s+/g, ' ').trim().toUpperCase();
                let codigoNumerico = "";

                // Regla de traducción (Diccionario de equivalencias)
                if (nombrePractica === "CONSULTA MEDICA") codigoNumerico = "420101";
                else if (nombrePractica === "CONSULTA MEDICA ESPECIALISTA") codigoNumerico = "425009";
                else if (nombrePractica === "CONSULTA POR GUARDIA") codigoNumerico = "420104";
                else if (nombrePractica === "CONSULTA OFTALMOLOGICA ADULTO") codigoNumerico = "420304";

                if (codigoNumerico) {
                    console.log(`Bloque Código -> Matcheó '${nombrePractica}' con el número: ${codigoNumerico}`);
                    inputCodigo.value = codigoNumerico;
                    inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
                    inputCodigo.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    console.log("Bloque Código -> Presionando ENTER");
                    inputCodigo.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', code: 'Enter', bubbles: true }));
                }
            }
            // Finalizado todo el recorrido, apagamos el interruptor general
            chrome.storage.local.set({ solicitud_activa: false });
            console.log("Flujo automatizado completo. Extensión liberada.");
        }
    });
}
