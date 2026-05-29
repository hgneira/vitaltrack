import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Guías por nombre de equipo (normalizado a minúsculas para match)
const GUIAS = {
  "monitor multiparámetros": [
    "Conectar el cable de corriente y presionar el botón de encendido.",
    "Esperar la autodiagnosis del sistema (aprox. 30 segundos).",
    "Conectar el sensor de SpO2 al dedo índice del paciente.",
    "Colocar el manguito de presión arterial en el brazo no dominante.",
    "Colocar los electrodos de ECG según la configuración de 5 derivaciones.",
    "Verificar que todas las alarmas estén activas con límites correctos para el paciente.",
    "Registrar los valores basales en el expediente clínico.",
  ],
  "monitor multiparámetros pediátrico": [
    "Conectar el cable de corriente y presionar el botón de encendido.",
    "Esperar la autodiagnosis del sistema y seleccionar perfil pediátrico.",
    "Conectar el sensor de SpO2 pediátrico (dedo o palma según peso).",
    "Colocar el manguito pediátrico del tamaño correspondiente al paciente.",
    "Colocar los electrodos de ECG pediátricos en posición correcta.",
    "Ajustar los límites de alarma a valores pediátricos normales.",
    "Registrar los valores basales en el expediente clínico.",
  ],
  "desfibrilador/cardioversor": [
    "Verificar que el equipo tenga carga de batería suficiente (>80%).",
    "Encender el equipo y esperar el diagnóstico automático.",
    "Seleccionar modo: DEA (automático) o Manual según indicación médica.",
    "Colocar los parches adhesivos: uno bajo la clavícula derecha y otro en el ápex cardíaco.",
    "En modo manual: seleccionar la energía en Joules según indicación médica.",
    "Anunciar en voz alta '¡Despejen!' y verificar que nadie toque al paciente.",
    "Presionar el botón de descarga y verificar el ritmo post-choque en el monitor.",
    "Registrar en la bitácora: hora, energía utilizada y respuesta del paciente.",
  ],
  "ventilador mecánico": [
    "Verificar conexión de oxígeno y aire medicinal (presión 50-60 psi).",
    "Encender el equipo y esperar que complete la autodiagnosis.",
    "Conectar el circuito de ventilación y realizar la prueba de fugas.",
    "Configurar los parámetros según indicación médica: modo, FR, VT, FiO2, PEEP.",
    "Conectar al paciente verificando que el tubo endotraqueal esté bien asegurado.",
    "Confirmar ventilación bilateral con auscultación y capnografía si está disponible.",
    "Verificar que las alarmas de alta/baja presión y apnea estén activas.",
    "Registrar los parámetros de ventilación en la hoja de enfermería.",
  ],
  "bomba de infusión": [
    "Conectar la bomba a la corriente y verificar el nivel de batería.",
    "Encender y esperar confirmación del diagnóstico automático.",
    "Insertar el equipo de infusión correctamente en la ranura de la bomba.",
    "Purgar el sistema con la solución a administrar hasta eliminar las burbujas.",
    "Programar: medicamento, concentración, volumen total y velocidad (mL/h).",
    "Conectar al catéter del paciente y abrir la llave de 3 vías.",
    "Iniciar la infusión y verificar que la bomba esté corriendo sin alarmas.",
    "Documentar medicamento, dosis y velocidad en la hoja de enfermería.",
  ],
  "bomba de infusión pediátrica": [
    "Conectar la bomba a la corriente y verificar el nivel de batería.",
    "Encender y seleccionar perfil pediátrico en el menú inicial.",
    "Insertar el equipo de infusión pediátrico en la ranura de la bomba.",
    "Purgar el sistema y verificar ausencia total de burbujas de aire.",
    "Programar dosis en mcg/kg/min o mL/h según el peso y prescripción médica.",
    "Conectar al catéter del paciente con precaución extrema.",
    "Iniciar la infusión y verificar que corre correctamente.",
    "Documentar en la hoja pediátrica: medicamento, peso, dosis/kg y velocidad.",
  ],
  "oxímetro de pulso": [
    "Encender el oxímetro y esperar la calibración automática.",
    "Limpiar el dedo del paciente (preferir índice o medio, sin esmalte).",
    "Colocar el sensor correctamente sobre el pulpejo del dedo.",
    "Esperar una lectura estable (15-30 segundos).",
    "Verificar que la curva de pletismografía sea de buena calidad.",
    "Configurar alarmas de SpO2 <90% y de FC según indicación médica.",
    "Registrar el valor en el expediente con la hora.",
  ],
  "oxímetro de pulso pediátrico": [
    "Encender el oxímetro y seleccionar el modo pediátrico.",
    "Seleccionar el sensor apropiado según el peso del paciente.",
    "Colocar el sensor en el dedo, palma o pie según la edad del paciente.",
    "Esperar una lectura estable (15-30 segundos).",
    "Verificar que la curva de pletismografía sea de buena calidad.",
    "Configurar alarmas con límites pediátricos: SpO2 <92%, FC según edad.",
    "Registrar el valor y el sitio de medición en el expediente.",
  ],
  "glucómetro": [
    "Limpiar el dedo del paciente con alcohol al 70% y dejar secar completamente.",
    "Encender el glucómetro e insertar una tira reactiva nueva.",
    "Realizar la punción en el lado del pulpejo del dedo con lanceta estéril.",
    "Aplicar la primera gota de sangre directamente sobre la zona de la tira.",
    "Esperar el resultado en la pantalla (aprox. 5 segundos).",
    "Registrar el valor en mg/dL en el expediente con hora y nombre del operador.",
    "Desechar lanceta y tira reactiva en el contenedor de RPBI.",
  ],
  "carro de paro cardiorrespiratorio": [
    "Verificar que el sello de seguridad esté intacto al inicio de cada turno.",
    "Abrir el carro únicamente ante una situación de paro cardiorrespiratorio.",
    "Identificar la ubicación de cada medicamento y material antes de usarlos.",
    "Preparar medicamentos y material según las instrucciones del médico líder.",
    "Documentar cada medicamento y material utilizado en el formato de paro.",
    "Al concluir el evento, reponer lo utilizado y colocar nuevo sello de seguridad.",
    "Registrar la revisión del carro en la bitácora con firma y fecha.",
  ],
  "aspirador de secreciones": [
    "Conectar el equipo a la toma de vacío de pared o al enchufe eléctrico.",
    "Encender y regular la presión de succión (adulto: 120-150 mmHg; pediátrico: 60-100 mmHg).",
    "Conectar la sonda de aspiración estéril al tubo colector.",
    "Introducir la sonda sin aspirar; aplicar succión solo al retirarla con movimiento rotatorio.",
    "Cada aspiración no debe exceder los 10-15 segundos.",
    "Enjuagar la sonda con agua estéril entre aspiraciones.",
    "Desechar la sonda en el contenedor de RPBI tras cada uso.",
  ],
  "aspirador quirúrgico": [
    "Conectar el equipo a la toma de vacío o al enchufe eléctrico.",
    "Verificar que el frasco colector esté vacío y bien enroscado.",
    "Encender y seleccionar la presión de succión indicada por el cirujano.",
    "Conectar la cánula de aspiración quirúrgica correspondiente.",
    "Aspirar los fluidos del campo quirúrgico según indicación.",
    "Vaciar el frasco colector cuando alcance los 2/3 de su capacidad.",
    "Al finalizar, limpiar y esterilizar la cánula reutilizable según el protocolo.",
  ],
  "aspirador portátil": [
    "Verificar la carga de batería antes de usarlo (indicador verde).",
    "Conectar la cánula de aspiración al tubo de la trampa de secreciones.",
    "Encender y verificar que genera succión adecuada.",
    "Aspirar con movimiento suave y rotatorio, máximo 15 segundos por evento.",
    "Vaciar y enjuagar el recipiente de secreciones con agua estéril tras el uso.",
    "Cargar la batería después de cada uso para tenerlo listo en la siguiente emergencia.",
  ],
  "laringoscopio de video": [
    "Conectar la pantalla al mango y encender el equipo; verificar imagen clara.",
    "Seleccionar la hoja del tamaño apropiado para el paciente (adulto o pediátrico).",
    "Posicionar al paciente en posición de olfateo con una almohada bajo la cabeza.",
    "Introducir la hoja por la comisura derecha de la boca desplazando la lengua.",
    "Visualizar la glotis en la pantalla y avanzar el tubo endotraqueal bajo visión directa.",
    "Confirmar la intubación con capnografía continua y auscultación bilateral.",
    "Limpiar y desinfectar el laringoscopio según protocolo de reprocesamiento.",
  ],
  "lámpara de exploración led": [
    "Encender la lámpara con el interruptor o pedal según el modelo.",
    "Orientar la luz hacia el área de exploración o procedimiento.",
    "Ajustar la intensidad luminosa según la necesidad clínica.",
    "Verificar que el brazo articulado esté bien asegurado antes de soltar.",
    "Apagar la lámpara al finalizar el procedimiento para prolongar la vida útil del LED.",
  ],
  "lámpara de exploración": [
    "Encender la lámpara con el interruptor principal.",
    "Orientar la luz hacia el área de trabajo.",
    "Ajustar la intensidad y el enfoque del haz luminoso.",
    "Verificar que el soporte esté bloqueado en la posición deseada.",
    "Apagar al terminar el procedimiento.",
  ],
  "electrocauterio": [
    "Verificar que el equipo esté apagado antes de instalar los accesorios.",
    "Conectar el electrodo neutro (placa dispersiva) en la zona muscular del muslo del paciente.",
    "Conectar el lápiz electroquirúrgico al puerto correspondiente (corte o coagulación).",
    "Encender el equipo y ajustar la potencia según indicación del médico.",
    "Activar el lápiz únicamente con pedal o botón cuando el médico lo indique.",
    "Apagar el equipo antes de desconectar los accesorios al finalizar.",
    "Limpiar el lápiz y verificar el estado de los cables tras cada uso.",
  ],
  "sierra oscilante para yesos": [
    "Verificar el estado del disco de corte (sin grietas ni desgaste excesivo).",
    "Colocar lámina protectora entre el yeso y la piel del paciente.",
    "Conectar la sierra a la corriente y verificar el funcionamiento.",
    "Realizar el corte con movimiento oscilante firme, sin deslizar la sierra lateralmente.",
    "Cortar en dos líneas paralelas para facilitar la apertura del yeso.",
    "Usar separadores para abrir el yeso sin riesgo de lesionar la piel.",
    "Limpiar el disco y el equipo al terminar.",
  ],
  "analizador de gases sanguíneos": [
    "Verificar que el cartucho esté dentro de fecha de vigencia y a temperatura ambiente.",
    "Insertar el cartucho en el analizador y esperar la confirmación.",
    "Obtener la muestra de sangre arterial con jeringa heparinizada.",
    "Eliminar inmediatamente cualquier burbuja de aire de la jeringa.",
    "Colocar la muestra en el cartucho en los primeros 30 segundos.",
    "Insertar el cartucho en el analizador y esperar el resultado (2-3 minutos).",
    "Registrar el resultado en el expediente con hora y firma del operador.",
  ],
  "analizador hematológico": [
    "Encender el equipo y esperar la inicialización completa.",
    "Correr los controles de calidad (bajo, normal, alto) al inicio del turno.",
    "Mezclar suavemente el tubo de muestra por inversión (8-10 veces).",
    "Colocar el tubo en el aspirador del equipo y confirmar el análisis.",
    "Esperar el resultado (aprox. 60 segundos).",
    "Revisar los indicadores de alarma del resultado antes de liberarlo.",
    "Registrar el resultado en el sistema informático del laboratorio.",
  ],
  "centrífuga clínica": [
    "Equilibrar los tubos colocando pesos similares en posiciones opuestas del rotor.",
    "Asegurar el rotor y cerrar la tapa correctamente.",
    "Programar velocidad (rpm) y tiempo según el tipo de muestra.",
    "Iniciar la centrifugación.",
    "No abrir la tapa mientras el rotor esté en movimiento.",
    "Esperar la parada completa antes de retirar las muestras.",
    "Limpiar el rotor si hubo derrame de muestra.",
  ],
  "centrífuga refrigerada": [
    "Verificar que el rotor esté limpio y bien instalado en el eje.",
    "Equilibrar las muestras con pesos similares en posiciones opuestas.",
    "Programar la temperatura (generalmente 4°C para muestras biológicas).",
    "Seleccionar velocidad y tiempo según el protocolo del laboratorio.",
    "Cerrar la tapa y verificar que el seguro esté activo.",
    "No interrumpir el ciclo; esperar la parada completa antes de abrir.",
    "Limpiar el rotor si ocurrió derrame y registrar el evento.",
  ],
  "microscopio binocular": [
    "Encender la fuente de luz y ajustar la intensidad al mínimo inicialmente.",
    "Colocar el portaobjetos en la platina y fijarlo con las pinzas.",
    "Comenzar con el objetivo de menor aumento (4x o 10x).",
    "Ajustar el enfoque grueso hasta obtener imagen general.",
    "Usar el enfoque fino para obtener imagen nítida.",
    "Aumentar gradualmente al objetivo de 40x según sea necesario.",
    "Limpiar los objetivos con papel óptico antes de guardar el microscopio.",
  ],
  "equipo de rayos x digital": [
    "Delimitar el área de trabajo y verificar que solo el personal indispensable esté presente.",
    "Equipar a todo el personal presente con delantal de plomo.",
    "Encender el equipo y seleccionar el protocolo del estudio solicitado.",
    "Posicionar correctamente al paciente según la proyección requerida.",
    "Colocar el detector digital en la posición correcta.",
    "Colimar el haz de rayos X al área de interés para reducir la dosis de radiación.",
    "Indicar al paciente que no se mueva, tomar la exposición y verificar la imagen.",
    "Liberar la imagen al sistema PACS para interpretación médica.",
  ],
  "negatoscopio led": [
    "Encender el negatoscopio con el interruptor lateral.",
    "Colocar la placa radiográfica con la orientación anatómica correcta.",
    "Ajustar la intensidad de la luz si el modelo lo permite.",
    "Evaluar la imagen en condiciones de penumbra para mejor contraste.",
    "Al terminar, apagar el negatoscopio y limpiar la superficie con paño suave.",
  ],
  "chalecos de plomo": [
    "Verificar la integridad del chaleco antes de usar (sin grietas ni dobleces).",
    "Colocar el chaleco cubriendo tiroides, tórax y gónadas.",
    "Usar durante toda la exposición a radiación ionizante.",
    "Al terminar, colgar el chaleco en el perchero vertical; nunca doblarlo.",
    "Reportar a Ingeniería Biomédica cualquier daño visible para revisión.",
  ],
  "equipo de ultrasonido": [
    "Encender el equipo y esperar la inicialización completa.",
    "Seleccionar el transductor apropiado según el estudio (lineal, convexo o sectorial).",
    "Aplicar gel de acoplamiento en abundante cantidad sobre la piel del paciente.",
    "Seleccionar el preajuste (preset) adecuado para el órgano a estudiar.",
    "Colocar el transductor y obtener imagen en tiempo real.",
    "Ajustar ganancia, profundidad y zona focal según sea necesario.",
    "Congelar la imagen para realizar mediciones y tomar capturas.",
    "Limpiar el transductor con paño húmedo al finalizar.",
  ],
  "refrigerador para hemoderivados": [
    "Verificar la temperatura del compartimento al inicio del turno (1-6°C).",
    "Registrar la temperatura en la bitácora de control dos veces por turno.",
    "Organizar las unidades de sangre con fecha de vencimiento visible.",
    "No sobrecargar el refrigerador para garantizar la circulación de aire frío.",
    "Verificar que la puerta cierre herméticamente.",
    "Si la temperatura sale del rango, escalar de inmediato a Ingeniería Biomédica.",
  ],
  "agitador de plaquetas": [
    "Verificar la temperatura del compartimento (20-24°C).",
    "Colocar las unidades de plaquetas en posición horizontal.",
    "Seleccionar la velocidad de agitación (60-70 rpm).",
    "Encender el agitador y verificar que el movimiento sea suave y continuo.",
    "Revisar las unidades cada hora buscando grumos o cambios de color.",
    "Registrar temperatura y estado del equipo en la bitácora cada 4 horas.",
  ],
  "detector de irradiación": [
    "Encender el equipo y esperar la autodiagnosis.",
    "Verificar la calibración usando la fuente de referencia del kit.",
    "Posicionar el detector frente al área o muestra a evaluar.",
    "Leer el valor en la pantalla e interpretar según los umbrales establecidos.",
    "Registrar los valores en el reporte de seguridad radiológica.",
    "Reportar lecturas fuera de lo normal al responsable de radioprotección.",
  ],
  "computadora de escritorio": [
    "Presionar el botón de encendido y esperar el inicio del sistema operativo.",
    "Iniciar sesión con las credenciales institucionales personales.",
    "Acceder al sistema hospitalario (HIS) o aplicación requerida.",
    "Al alejarse del equipo, bloquear la sesión (Ctrl+L o Windows+L).",
    "Cerrar la sesión completamente al finalizar el turno.",
    "Reportar cualquier falla al área de TI; nunca compartir credenciales.",
  ],
  "computadora portátil": [
    "Abrir la pantalla y presionar el botón de encendido.",
    "Iniciar sesión con las credenciales institucionales personales.",
    "Conectar al cable de corriente si la batería está por debajo del 30%.",
    "Al alejarse, bloquear la sesión para proteger la información del paciente.",
    "Cerrar la sesión al finalizar el turno y guardar el equipo en lugar seguro.",
    "Reportar cualquier falla al área de TI.",
  ],
  "impresora láser": [
    "Verificar el nivel de tóner y la disponibilidad de papel al inicio del turno.",
    "Encender la impresora y esperar el indicador verde de lista.",
    "Imprimir desde el sistema hospitalario seleccionando la impresora correcta.",
    "Retirar los documentos impresos de inmediato (contienen datos del paciente).",
    "Reportar atascos de papel o alertas de tóner al área de TI.",
  ],
  "impresora de pulseras": [
    "Verificar que haya rollos de pulseras instalados correctamente.",
    "Encender la impresora y esperar el indicador verde estable.",
    "En el sistema HIS, buscar al paciente y seleccionar 'Imprimir pulsera'.",
    "Verificar que los datos en la pantalla sean correctos antes de imprimir.",
    "Confirmar la impresión.",
    "Colocar la pulsera en la muñeca del paciente y verificar los datos en voz alta con el paciente.",
  ],
  "lector de código qr/barras": [
    "Conectar el lector al puerto USB de la computadora.",
    "Abrir el sistema de recepción de pacientes o módulo correspondiente.",
    "Apuntar el lector al código QR o de barras del documento.",
    "Verificar que la información capturada sea correcta en la pantalla del sistema.",
    "Confirmar el registro en el sistema.",
  ],
  "sistema de intercomunicación": [
    "Verificar que el sistema esté encendido y con señal activa.",
    "Presionar el botón del cubículo o área a contactar.",
    "Hablar claramente identificándose: nombre, servicio y mensaje.",
    "Esperar confirmación de recepción del otro extremo.",
    "Para alertas de emergencia, usar el código de llamada de urgencia del hospital.",
  ],
  "tensiómetro digital": [
    "Pedir al paciente que permanezca sentado y en reposo durante 5 minutos.",
    "Colocar el manguito 2 cm por encima del pliegue del codo.",
    "El brazo debe estar al nivel del corazón y sin ropa que lo comprima.",
    "Presionar el botón de inicio y pedir al paciente que permanezca quieto.",
    "Esperar la lectura completa (30-40 segundos).",
    "Registrar los valores de PAS, PAD y FC en el expediente.",
    "Limpiar el manguito con paño impregnado en alcohol entre pacientes.",
  ],
  "báscula digital": [
    "Colocar la báscula en una superficie plana y firme.",
    "Encender y verificar que marque cero (tara si es necesario).",
    "Pedir al paciente que se descalce y retire objetos pesados (ropa gruesa, llaves).",
    "Pedir al paciente que suba y se coloque al centro de la plataforma.",
    "Esperar a que la lectura se estabilice.",
    "Registrar el peso en kg en el expediente clínico.",
    "Desinfectar la plataforma entre pacientes.",
  ],
  "báscula industrial": [
    "Colocar la báscula en superficie plana y verificar nivelación con la burbuja.",
    "Encender y verificar que marque cero.",
    "Colocar el objeto o equipo al centro de la plataforma.",
    "Esperar que la lectura se estabilice y registrarla.",
    "Apagar al terminar.",
  ],
  "termómetro infrarrojo": [
    "Verificar que el termómetro tenga batería suficiente.",
    "Enderecer el canal auditivo tirando suavemente del pabellón auricular hacia atrás y arriba.",
    "Colocar la cubierta protectora nueva antes de cada uso.",
    "Insertar suavemente la sonda en el canal auditivo en dirección al tímpano.",
    "Presionar el botón y esperar el pitido de confirmación (1-2 segundos).",
    "Leer el resultado en la pantalla.",
    "Cambiar la cubierta protectora y desecharla en basura general.",
    "Registrar la temperatura y la vía en el expediente.",
  ],
  "refrigerador de medicamentos": [
    "Verificar la temperatura al inicio del turno (2-8°C).",
    "Registrar la temperatura en la bitácora dos veces por turno.",
    "Organizar los medicamentos por categoría y fecha de vencimiento.",
    "Retirar y reportar medicamentos vencidos o con signos de daño.",
    "Mantener el refrigerador limpio y libre de alimentos.",
    "Reportar inmediatamente al jefe de enfermería si la temperatura sale de rango.",
  ],
  "gabinete de narcóticos": [
    "Verificar que el gabinete esté cerrado y el sello intacto al inicio del turno.",
    "Abrir el gabinete únicamente con dos personas presentes (enfermera + testigo).",
    "Registrar en la bitácora: medicamento, dosis, paciente, fecha, hora y firmas de ambos.",
    "Contar el inventario al inicio y al final de cada turno.",
    "Reportar inmediatamente cualquier discrepancia al jefe de enfermería.",
    "Bloquear el gabinete antes de retirarse del cuarto de medicamentos.",
  ],
  "ducha de descontaminación": [
    "Activar el sistema de agua y verificar la temperatura (15-25°C).",
    "Equiparse con EPP apropiado antes de asistir al paciente.",
    "Dirigir al paciente al área de descontaminación.",
    "Retirar la ropa contaminada y colocarla en bolsa para residuos RPBI.",
    "Realizar el lavado con agua y jabón especial por al menos 15 minutos.",
    "Proteger los ojos y vías respiratorias del paciente durante el proceso.",
    "Verificar que no queden residuos del agente contaminante en la piel.",
  ],
  "televisor": [
    "Encender con el control remoto o el botón frontal.",
    "Ajustar el volumen a nivel apropiado para sala de espera (moderado).",
    "Seleccionar canal con contenido adecuado para pacientes en espera.",
    "Apagar al finalizar el horario de atención o turno nocturno.",
  ],
  "dispensador de fichas": [
    "Verificar que haya papel de fichas instalado al inicio del turno.",
    "Encender el sistema y confirmar que el número de turno sea el correcto.",
    "El paciente presiona el botón correspondiente a su tipo de atención.",
    "El sistema imprime la ficha con número y área de atención.",
    "Si el sistema falla, reportar a recepción para manejo manual de turnos.",
  ],
  "pantalla interactiva": [
    "Encender con el botón de la pantalla o el control remoto.",
    "Seleccionar la fuente de entrada correcta (HDMI, PC integrada o USB).",
    "Para presentaciones, conectar la laptop por HDMI y seleccionar esa fuente.",
    "Calibrar el toque (touch) si la pantalla no responde con precisión.",
    "Al terminar, cerrar las aplicaciones abiertas y apagar la pantalla.",
  ],
  "calentador de fluidos iv": [
    "Conectar el equipo a la corriente eléctrica.",
    "Encender y seleccionar la temperatura objetivo (generalmente 39-40°C).",
    "Instalar el set de infusión compatible con el equipo.",
    "Purgar el set con la solución a administrar.",
    "Verificar en la pantalla que la temperatura alcanzó el valor programado antes de conectar al paciente.",
    "Conectar al catéter del paciente e iniciar la infusión.",
    "Monitorear la temperatura de salida durante la infusión.",
  ],
  "compresor de rcp mecánico": [
    "Colocar la plataforma base bajo la espalda del paciente a nivel del pecho.",
    "Ajustar el arco superior sobre el tórax del paciente.",
    "Posicionar el pistón de compresión sobre la mitad inferior del esternón.",
    "Encender el equipo y verificar la frecuencia (100-120 compresiones/min) y profundidad (5-6 cm).",
    "Iniciar las compresiones automáticas e integrar con la ventilación asistida.",
    "Verificar continuamente la posición del pistón durante la reanimación.",
    "Apagar y retirar el dispositivo tan pronto como haya retorno a la circulación espontánea.",
  ],
  "lámpara de calor radiante": [
    "Encender el equipo y seleccionar el modo de control (manual o servocontrol).",
    "En modo servocontrol: colocar el sensor de piel en el abdomen del neonato.",
    "Ajustar la temperatura objetivo (generalmente 36.5°C en modo servocontrol).",
    "Verificar que la lámpara esté correctamente posicionada sobre el paciente.",
    "Monitorear la temperatura del paciente continuamente.",
    "Evitar cubrir al paciente con mantas mientras la lámpara esté activa.",
    "Registrar la temperatura del neonato cada 30 minutos en la hoja de enfermería.",
  ],
  "sutura mecánica": [
    "Verificar que la sutura mecánica sea del calibre y longitud correctos para el procedimiento.",
    "Cargar el cartucho de grapas en el instrumento según las instrucciones del fabricante.",
    "Posicionar el tejido dentro de las mandíbulas del instrumento.",
    "Verificar alineación correcta antes de disparar.",
    "Disparar el mecanismo en un solo movimiento firme y continuo.",
    "Retirar el instrumento con cuidado y verificar la línea de grapas.",
    "Desechar el instrumento y el cartucho usado en el contenedor de RPBI.",
  ],
  "aspirador de polvo de yeso": [
    "Verificar que el filtro del equipo esté limpio y en buen estado.",
    "Conectar el aspirador a la corriente eléctrica.",
    "Encender el equipo antes de comenzar el corte del yeso.",
    "Posicionar la boquilla del aspirador junto al disco de la sierra oscilante.",
    "Mantener el aspirador activo durante todo el proceso de corte.",
    "Apagar y vaciar el recipiente de polvo al terminar.",
    "Limpiar el filtro después de cada uso.",
  ],
  "coagulómetro": [
    "Encender el equipo y esperar la inicialización completa.",
    "Correr los controles de calidad al inicio del turno.",
    "Verificar que los reactivos estén dentro de fecha de vigencia.",
    "Pipetear el volumen de muestra indicado en la cubeta de reacción.",
    "Colocar la cubeta en el equipo según el protocolo.",
    "Esperar el resultado y verificar que no haya alarmas de error.",
    "Registrar el resultado en el sistema del laboratorio con hora y datos del paciente.",
  ],
  "chaleco de plomo": [
    "Verificar la integridad del chaleco antes de usar (sin grietas ni dobleces).",
    "Colocar el chaleco cubriendo tiroides, tórax y gónadas.",
    "Usar durante toda la exposición a radiación ionizante.",
    "Al terminar, colgar el chaleco en el perchero vertical; nunca doblarlo.",
    "Reportar a Ingeniería Biomédica cualquier daño visible para revisión.",
  ],
  "delantal de plomo": [
    "Verificar la integridad del delantal antes de usar (sin grietas ni dobleces en el plomo).",
    "Colocar el delantal cubriendo la parte frontal del tórax, abdomen y gónadas.",
    "Usar durante toda la exposición a radiación ionizante.",
    "Al terminar, colgar en el perchero designado; nunca doblar ni enrollar.",
    "Reportar a Ingeniería Biomédica cualquier daño visible.",
  ],
  "desfibrilador dea": [
    "Abrir el equipo: el audio guiará automáticamente al operador.",
    "Encender el DEA presionando el botón de inicio.",
    "Colocar los parches adhesivos según el diagrama indicado en los parches (uno bajo la clavícula derecha, otro en el ápex).",
    "Conectar los parches al equipo si no están pre-conectados.",
    "Alejarse del paciente mientras el DEA analiza el ritmo cardíaco.",
    "Si el DEA indica descarga: anunciar '¡Despejen!', verificar que nadie toque al paciente y presionar el botón de choque.",
    "Reanudar la RCP inmediatamente después de la descarga.",
    "Seguir las instrucciones de audio del equipo hasta la llegada del equipo médico.",
  ],
  "báscula para medicamentos": [
    "Colocar la báscula en superficie plana y estable.",
    "Encender y esperar la estabilización en cero.",
    "Colocar el recipiente tara (si aplica) y presionar el botón de tara.",
    "Colocar el medicamento o sustancia a pesar.",
    "Esperar que la lectura se estabilice y registrar el valor.",
    "Apagar al terminar y limpiar la plataforma.",
  ],
  "silla de ruedas plegable": [
    "Desplegar la silla abriendo el asiento con ambas manos.",
    "Verificar que los frenos estén activados antes de transferir al paciente.",
    "Asistir al paciente para sentarse asegurándose de que quede bien posicionado.",
    "Colocar los pies del paciente en los apoyapiés.",
    "Liberar los frenos para desplazar al paciente.",
    "Activar los frenos cada vez que el paciente deba subir o bajar.",
    "Al terminar, plegar la silla levantando el asiento y guardar en lugar designado.",
  ],
  "camilla de transporte": [
    "Verificar que los frenos de la camilla estén bloqueados antes de transferir al paciente.",
    "Ajustar la altura de la camilla al nivel de la cama del paciente.",
    "Realizar la transferencia con al menos dos personas.",
    "Colocar y asegurar los barandales laterales.",
    "Liberar los frenos para el traslado.",
    "Durante el traslado, mantener la velocidad moderada y avisar al paciente de los movimientos.",
    "Activar los frenos al llegar al destino antes de transferir nuevamente.",
    "Limpiar la camilla con desinfectante de superficies después de cada uso.",
  ],
  "carro de transporte de equipos": [
    "Verificar que el carro esté limpio y con frenos funcionales.",
    "Colocar los equipos asegurándolos para evitar caídas durante el traslado.",
    "No sobrecargar el carro por encima de su capacidad indicada.",
    "Usar los frenos al cargar y descargar equipos.",
    "Limpiar el carro con paño con solución desinfectante después de cada uso.",
  ],
  "analizador de electrolitos": [
    "Encender el equipo y esperar la inicialización y autodiagnosis.",
    "Correr el control de calidad al inicio del turno.",
    "Mezclar suavemente la muestra por inversión antes del análisis.",
    "Colocar la muestra en el puerto de aspiración del equipo.",
    "Esperar el resultado y verificar que no haya indicadores de error.",
    "Registrar el resultado en el sistema informático del laboratorio.",
    "Realizar el lavado del sistema con solución limpiadora al finalizar el turno.",
  ],
};

// Función para normalizar nombres
function normalizar(nombre) {
  return nombre.toLowerCase().trim();
}

// Obtener pasos para un equipo según su nombre
function getPasos(nombre) {
  const n = normalizar(nombre);
  // Buscar match exacto primero
  if (GUIAS[n]) return GUIAS[n];
  // Buscar match parcial
  for (const [key, pasos] of Object.entries(GUIAS)) {
    if (n.includes(key) || key.includes(n)) return pasos;
  }
  return null;
}

async function main() {
  const equipos = await prisma.equipoMedico.findMany({
    select: { id: true, nombre: true, marca: true, modelo: true },
  });

  console.log(`Total equipos encontrados: ${equipos.length}`);

  let actualizados = 0;
  let sinGuia = 0;

  for (const eq of equipos) {
    const pasos = getPasos(eq.nombre);
    if (!pasos) {
      console.log(`  ⚠ Sin guía para: "${eq.nombre}" (${eq.marca} ${eq.modelo})`);
      sinGuia++;
      continue;
    }

    // Verificar si ya tiene guía
    const guiaExistente = await prisma.guiaRapida.findUnique({
      where: { equipoId: eq.id },
    });

    if (guiaExistente) {
      await prisma.guiaRapida.update({
        where: { equipoId: eq.id },
        data: { pasos },
      });
    } else {
      await prisma.guiaRapida.create({
        data: { equipoId: eq.id, pasos },
      });
    }
    actualizados++;
  }

  console.log(`\n✅ Guías actualizadas: ${actualizados}`);
  console.log(`⚠  Sin guía definida: ${sinGuia}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
