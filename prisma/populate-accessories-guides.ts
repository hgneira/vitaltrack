import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString:
    "postgresql://neondb_owner:npg_4Ak1gUVwiYBP@ep-spring-tree-ancapiud.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
const prisma = new PrismaClient({ adapter });

async function addAccesorios(
  equipoId: string,
  accesorios: { nombre: string; requerido: boolean }[]
) {
  const existing = await prisma.accesorioEquipo.count({ where: { equipoId } });
  if (existing > 0) {
    console.log(`  ⏭  ${equipoId}: ya tiene accesorios`);
    return;
  }
  for (let i = 0; i < accesorios.length; i++) {
    await prisma.accesorioEquipo.create({
      data: {
        equipoId,
        nombre: accesorios[i].nombre,
        requerido: accesorios[i].requerido,
        orden: i,
      },
    });
  }
  console.log(`  ✅ ${equipoId}: ${accesorios.length} accesorios`);
}

async function addGuia(equipoId: string, pasos: string[]) {
  const existing = await prisma.guiaRapida.findUnique({ where: { equipoId } });
  if (existing) {
    console.log(`  ⏭  ${equipoId}: ya tiene guía`);
    return;
  }
  await prisma.guiaRapida.create({ data: { equipoId, pasos } });
  console.log(`  ✅ ${equipoId}: guía creada`);
}

async function main() {
  console.log("🚀 Iniciando carga de accesorios y guías...\n");

  const ACC = {
    monitor_signos: [
      { nombre: "Cable de ECG de 5 derivaciones", requerido: true },
      { nombre: "Brazalete de presión arterial adulto", requerido: true },
      { nombre: "Sensor de SpO2 (oximetría)", requerido: true },
      { nombre: "Sensor de temperatura", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Electrodos desechables", requerido: true },
      { nombre: "Papel de registro térmico", requerido: false },
    ],
    ventilador: [
      { nombre: "Circuito de ventilación adulto", requerido: true },
      { nombre: "Trampa de agua (humidificador pasivo)", requerido: true },
      { nombre: "Filtro bacteriano/viral", requerido: true },
      { nombre: "Tubería de conexión a O2", requerido: true },
      { nombre: "Tubería de conexión a aire comprimido", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Tubo endotraqueal (varios tamaños)", requerido: true },
      { nombre: "Fijador de tubo endotraqueal", requerido: true },
    ],
    desfibrilador: [
      { nombre: "Palas de desfibrilación adulto", requerido: true },
      { nombre: "Palas de desfibrilación pediátrico", requerido: true },
      { nombre: "Electrodos de monitoreo", requerido: true },
      { nombre: "Gel conductor", requerido: true },
      { nombre: "Cable de ECG", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Batería de respaldo cargada", requerido: true },
      { nombre: "Papel térmico de registro", requerido: false },
    ],
    bomba_infusion: [
      { nombre: "Set de infusión (macrogotero)", requerido: true },
      { nombre: "Set de microgotero pediátrico", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Batería de respaldo", requerido: true },
      { nombre: "Soporte de montaje", requerido: true },
    ],
    carro_rojo_adulto: [
      { nombre: "Desfibrilador operativo", requerido: true },
      { nombre: "Bolsa de reanimación BVM adulto", requerido: true },
      { nombre: "Laringoscopio adulto con hojas", requerido: true },
      { nombre: "Tubos endotraqueales (tallas 7.0, 7.5, 8.0)", requerido: true },
      { nombre: "Guía metálica para intubación", requerido: true },
      { nombre: "Adrenalina 1:1000", requerido: true },
      { nombre: "Atropina", requerido: true },
      { nombre: "Amiodarona", requerido: true },
      { nombre: "Solución fisiológica 0.9%", requerido: true },
      { nombre: "Jeringas de 10 mL y 20 mL", requerido: true },
      { nombre: "Tabla de compresiones cardíacas", requerido: true },
      { nombre: "Sello hermético del carro", requerido: true },
    ],
    carro_rojo_pediatrico: [
      { nombre: "Bolsa BVM pediátrica", requerido: true },
      { nombre: "Bolsa BVM neonatal", requerido: true },
      { nombre: "Laringoscopio pediátrico con hojas", requerido: true },
      { nombre: "Tubos endotraqueales pediátricos (2.5 a 6.0)", requerido: true },
      { nombre: "Guía metálica para intubación pediátrica", requerido: true },
      { nombre: "Adrenalina 1:10000", requerido: true },
      { nombre: "Atropina dosis pediátrica", requerido: true },
      { nombre: "Tabla de compresiones pediátrico", requerido: true },
      { nombre: "Sello hermético del carro", requerido: true },
    ],
    bvm_adulto: [
      { nombre: "Mascarilla facial adulto talla 3 o 4", requerido: true },
      { nombre: "Válvula de no retorno", requerido: true },
      { nombre: "Reservorio de oxígeno", requerido: true },
      { nombre: "Tubería de conexión a O2", requerido: true },
    ],
    bvm_pediatrico: [
      { nombre: "Mascarilla facial pediátrica talla 1 o 2", requerido: true },
      { nombre: "Válvula de no retorno", requerido: true },
      { nombre: "Reservorio de oxígeno", requerido: true },
      { nombre: "Tubería de conexión a O2", requerido: true },
    ],
    bvm_neonato: [
      { nombre: "Mascarilla neonatal talla 0 o 1", requerido: true },
      { nombre: "Válvula de no retorno", requerido: true },
      { nombre: "Reservorio de oxígeno", requerido: true },
      { nombre: "Tubería de conexión a O2", requerido: true },
    ],
    laringoscopio_adulto: [
      { nombre: "Mango de laringoscopio", requerido: true },
      { nombre: "Hoja Macintosh N°3", requerido: true },
      { nombre: "Hoja Macintosh N°4", requerido: true },
      { nombre: "Hoja Miller N°2", requerido: false },
      { nombre: "Pilas AA o C", requerido: true },
      { nombre: "Foco de repuesto", requerido: false },
    ],
    laringoscopio_pediatrico: [
      { nombre: "Mango de laringoscopio", requerido: true },
      { nombre: "Hoja Miller N°0 (neonatal)", requerido: true },
      { nombre: "Hoja Miller N°1 (lactante)", requerido: true },
      { nombre: "Hoja Macintosh N°2 (pediátrico)", requerido: true },
      { nombre: "Pilas AA", requerido: true },
      { nombre: "Foco de repuesto", requerido: false },
    ],
    electrocardio: [
      { nombre: "Cable de derivaciones de 10 electrodos", requerido: true },
      { nombre: "Electrodos precordiales (ventosas)", requerido: true },
      { nombre: "Electrodos de extremidades (ganchos/pinzas)", requerido: true },
      { nombre: "Electrodos desechables adhesivos", requerido: true },
      { nombre: "Gel conductor", requerido: true },
      { nombre: "Papel térmico de registro", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
    ],
    esfigmo: [
      { nombre: "Brazalete adulto", requerido: true },
      { nombre: "Brazalete pediátrico", requerido: true },
      { nombre: "Perilla de insuflación", requerido: true },
      { nombre: "Manguera de conexión", requerido: true },
      { nombre: "Estuche de transporte", requerido: false },
    ],
    esfigmo_pediatrico: [
      { nombre: "Brazalete neonatal", requerido: true },
      { nombre: "Brazalete pediátrico pequeño", requerido: true },
      { nombre: "Brazalete pediátrico mediano", requerido: true },
      { nombre: "Perilla de insuflación", requerido: true },
      { nombre: "Manguera de conexión", requerido: true },
    ],
    estetoscopio: [
      { nombre: "Auriculares", requerido: true },
      { nombre: "Diafragma", requerido: true },
      { nombre: "Campana", requerido: true },
      { nombre: "Tubing de repuesto", requerido: false },
    ],
    estetoscopio_pediatrico: [
      { nombre: "Auriculares", requerido: true },
      { nombre: "Cápsula/diafragma pediátrico", requerido: true },
      { nombre: "Campana pediátrica", requerido: true },
    ],
    estetoscopio_pinard: [
      { nombre: "Bocina de madera o metal completa", requerido: true },
    ],
    estuche_diagnostico: [
      { nombre: "Mango de otoscopio", requerido: true },
      { nombre: "Mango de oftalmoscopio", requerido: true },
      { nombre: "Espéculos auriculares (tallas pequeña, mediana, grande)", requerido: true },
      { nombre: "Pilas AA", requerido: true },
      { nombre: "Foco de repuesto", requerido: false },
    ],
    incubadora_traslado: [
      { nombre: "Sensor de temperatura corporal", requerido: true },
      { nombre: "Sensor de SpO2 neonatal", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Batería de respaldo", requerido: true },
      { nombre: "Colchoneta de incubadora", requerido: true },
      { nombre: "Filtro de aire", requerido: true },
    ],
    incubadora_general: [
      { nombre: "Sensor de temperatura corporal", requerido: true },
      { nombre: "Colchoneta de incubadora", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Filtro de aire", requerido: true },
      { nombre: "Puerto de acceso (iris) funcional", requerido: true },
    ],
    marcapasos: [
      { nombre: "Electrodos de estimulación adulto (parches)", requerido: true },
      { nombre: "Electrodos de estimulación pediátrico", requerido: false },
      { nombre: "Cable de conexión electrodos-marcapasos", requerido: true },
      { nombre: "Batería de 9V", requerido: true },
      { nombre: "Cable de ECG de monitoreo", requerido: true },
    ],
    tanque_oxigeno: [
      { nombre: "Manómetro/flujómetro", requerido: true },
      { nombre: "Regulador de oxígeno", requerido: true },
      { nombre: "Mascarilla de oxígeno o cánula nasal", requerido: true },
      { nombre: "Tubería de conexión", requerido: true },
      { nombre: "Carro o soporte del tanque", requerido: true },
      { nombre: "Nivel de carga > 500 psi", requerido: true },
    ],
    collarin: [
      { nombre: "Parte anterior del collarín", requerido: true },
      { nombre: "Parte posterior del collarín", requerido: true },
      { nombre: "Cintas velcro de sujeción funcionales", requerido: true },
    ],
    dispositivo_cabeza: [
      { nombre: "Bloques laterales de cabeza", requerido: true },
      { nombre: "Correa frontal de sujeción", requerido: true },
      { nombre: "Correa de mentón", requerido: true },
      { nombre: "Base de fijación a camilla", requerido: true },
    ],
    tabla_compresiones: [
      { nombre: "Tabla rígida de respaldo", requerido: true },
      { nombre: "Cinturones o correas de sujeción", requerido: true },
    ],
    dosificador_o2: [
      { nombre: "Frasco humidificador", requerido: true },
      { nombre: "Agua destilada", requerido: true },
      { nombre: "Tubería de conexión a toma de O2", requerido: true },
      { nombre: "Cánula nasal o mascarilla", requerido: true },
      { nombre: "Flujómetro calibrado", requerido: true },
    ],
    mascarilla_o2: [
      { nombre: "Mascarilla completa", requerido: true },
      { nombre: "Banda elástica ajustable", requerido: true },
      { nombre: "Tubería de conexión", requerido: true },
    ],
    lampara: [
      { nombre: "Foco halógeno o LED", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Brazo articulado funcional", requerido: true },
    ],
    bascula_estadimetro: [
      { nombre: "Plataforma de pesaje", requerido: true },
      { nombre: "Estadímetro (regla de talla)", requerido: true },
      { nombre: "Baterías o cable de alimentación", requerido: true },
      { nombre: "Nivel de burbuja calibrado", requerido: false },
    ],
    bascula_bebe: [
      { nombre: "Charola o bandeja de pesaje", requerido: true },
      { nombre: "Cable de alimentación o baterías", requerido: true },
      { nombre: "Cobertor de charola", requerido: false },
    ],
    negatoscopio: [
      { nombre: "Panel de iluminación", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Panel de cristal limpio", requerido: true },
    ],
    camilla: [
      { nombre: "Barandales laterales (x2)", requerido: true },
      { nombre: "Colchoneta", requerido: true },
      { nombre: "Cinturones de sujeción", requerido: true },
      { nombre: "Ruedas con freno funcionales", requerido: true },
    ],
    mesa_exploracion: [
      { nombre: "Colchoneta o forro", requerido: true },
      { nombre: "Escalón de acceso", requerido: true },
      { nombre: "Estribo o soporte para piernas", requerido: false },
    ],
    mesa_karam: [
      { nombre: "Colchoneta limpia", requerido: true },
      { nombre: "Cinturones de sujeción laterales", requerido: true },
    ],
    mesa_mayo: [
      { nombre: "Charola de acero inoxidable", requerido: true },
      { nombre: "Tornillo de ajuste de altura funcional", requerido: true },
    ],
    mesa_pasteur: [
      { nombre: "Charola superior", requerido: true },
      { nombre: "Ruedas con freno", requerido: true },
    ],
    portavenoclisis: [
      { nombre: "Ganchos de colgado (mínimo 2)", requerido: true },
      { nombre: "Base con ruedas", requerido: true },
      { nombre: "Tornillo de fijación de altura", requerido: true },
    ],
    cama_barandales: [
      { nombre: "Barandales laterales (x2)", requerido: true },
      { nombre: "Colchoneta", requerido: true },
      { nombre: "Manivela de ajuste", requerido: true },
      { nombre: "Ruedas con freno", requerido: true },
    ],
    equipo_sutura: [
      { nombre: "Portaagujas", requerido: true },
      { nombre: "Tijeras de Mayo", requerido: true },
      { nombre: "Tijeras de Iris", requerido: true },
      { nombre: "Pinza de disección con dientes", requerido: true },
      { nombre: "Pinza de disección sin dientes", requerido: true },
      { nombre: "Pinza hemostática Kocher", requerido: true },
      { nombre: "Mango de bisturí", requerido: true },
      { nombre: "Campo estéril", requerido: true },
    ],
    carro_curaciones: [
      { nombre: "Pinzas de curación", requerido: true },
      { nombre: "Gasas estériles", requerido: true },
      { nombre: "Vendas de gasa", requerido: true },
      { nombre: "Solución antiséptica (isodine/clorhexidina)", requerido: true },
      { nombre: "Solución fisiológica para irrigación", requerido: true },
      { nombre: "Guantes estériles", requerido: true },
      { nombre: "Cinta adhesiva", requerido: true },
    ],
    sierra_yeso: [
      { nombre: "Sierra oscilante", requerido: true },
      { nombre: "Hoja de sierra", requerido: true },
      { nombre: "Cizalla", requerido: true },
      { nombre: "Gubia o extensora", requerido: true },
      { nombre: "Cable de alimentación", requerido: true },
      { nombre: "Protector auditivo del operador", requerido: false },
    ],
    banco_altura: [
      { nombre: "Escalón", requerido: true },
      { nombre: "Base antideslizante en buen estado", requerido: true },
    ],
    termometro: [
      { nombre: "Sonda o punta de medición", requerido: true },
      { nombre: "Baterías", requerido: true },
      { nombre: "Protectores de sonda desechables", requerido: true },
    ],
    pinza_traslado: [
      { nombre: "Mecanismo de pinza funcional", requerido: true },
      { nombre: "Contenedor estéril o funda de almacenamiento", requerido: true },
    ],
  };

  const GUIAS = {
    monitor_signos: [
      "Conecte el cable de alimentación y encienda el monitor presionando el botón de encendido.",
      "Coloque los electrodos de ECG en el paciente según la numeración indicada en los cables (RA, LA, RL, LL, V).",
      "Conecte el sensor de SpO2 en el dedo índice del paciente con la ventana del sensor apuntando a la uña.",
      "Coloque el brazalete de presión arterial en el brazo no dominante del paciente, 2 cm por encima del codo.",
      "Introduzca el sensor de temperatura según protocolo (axilar, rectal u oral).",
      "Seleccione la frecuencia de medición automática en el menú principal (cada 5, 15 o 30 minutos según indicación).",
      "Configure las alarmas según los parámetros normales del paciente antes de iniciar el monitoreo.",
    ],
    ventilador: [
      "Verifique que el equipo esté conectado a O2 y aire comprimido, y que la batería esté cargada.",
      "Ensamble el circuito de ventilación limpio: tubería inspiratoria, espiratoria, trampa de agua y filtro.",
      "Realice la autocomprobación del ventilador siguiendo las instrucciones en pantalla.",
      "Configure los parámetros prescritos: modo de ventilación, volumen tidal, frecuencia respiratoria, FiO2 y PEEP.",
      "Conecte el circuito al tubo endotraqueal del paciente y verifique la simetría de los movimientos torácicos.",
      "Confirme las curvas de flujo y presión en la pantalla; ajuste las alarmas de acuerdo con los parámetros del paciente.",
      "Documente los parámetros ventilatorios y hora de inicio en el expediente.",
    ],
    desfibrilador: [
      "Encienda el equipo y verifique la carga de la batería (mínimo 80%).",
      "Coloque los electrodos de monitoreo en el paciente y confirme el ritmo en la pantalla.",
      "Para cardioversión/desfibrilación: aplique gel conductor en las palas o use electrodos adhesivos.",
      "Seleccione la energía indicada (200 J bifásico en adultos, 2 J/kg en niños) y cargue el equipo.",
      "Anuncie '¡Apartense!' y verifique que nadie tenga contacto con el paciente antes de descargar.",
      "Descargue presionando simultáneamente los botones de descarga en ambas palas.",
      "Evalúe el ritmo cardíaco inmediatamente y reinicie RCP si es necesario.",
    ],
    bomba_infusion: [
      "Instale la bomba en el portavenoclisis y conecte el cable de alimentación.",
      "Cargue el set de infusión en el canal de la bomba siguiendo la guía indicada (flecha hacia abajo).",
      "Purgue el set de infusión para eliminar el aire antes de conectarlo al paciente.",
      "Programe el volumen total, la dosis o la velocidad en mL/h según prescripción médica.",
      "Conecte el set al catéter o vía del paciente y active el modo de infusión (Start).",
      "Configure las alarmas de oclusión, fin de infusión y batería baja.",
      "Verifique periódicamente el sitio de punción y la permeabilidad de la vía.",
    ],
    carro_rojo_adulto: [
      "Verifique el sello de seguridad del carro; si está roto, notifique inmediatamente al jefe de turno.",
      "Confirme que el desfibrilador esté encendido y con carga de batería suficiente.",
      "En caso de paro, coloque la tabla de compresiones bajo el paciente e inicie RCP (100-120 compresiones/min).",
      "Asigne un responsable del carro para entregar material mientras otro realiza las compresiones.",
      "Prepare la bolsa BVM y conéctela a oxígeno a 15 L/min con reservorio.",
      "Administre medicamentos de emergencia según protocolo (Adrenalina 1 mg IV cada 3-5 min).",
      "Tras el evento, reponga todo el material utilizado y coloque un nuevo sello de seguridad.",
    ],
    carro_rojo_pediatrico: [
      "Verifique el sello de seguridad; si está roto, notifique y resurtido de inmediato.",
      "Confirme que el desfibrilador pediátrico esté operativo y con palas pediátricas instaladas.",
      "En paro pediátrico, inicie compresiones a 1/3 del diámetro torácico anteroposterior.",
      "Seleccione el material de vía aérea según el tamaño del paciente (tubos ET pediátricos por edad/peso).",
      "Prepare la bolsa BVM neonatal o pediátrica con mascarilla del tamaño correcto.",
      "Administre adrenalina a dosis pediátrica (0.01 mg/kg IV) según protocolo.",
      "Tras el evento, reponga material y coloque nuevo sello de seguridad.",
    ],
    bvm: [
      "Verifique que la mascarilla sea del tamaño adecuado (cubre nariz y boca sin presionar los ojos).",
      "Conecte el reservorio y la tubería de oxígeno; ajuste el flujo a 15 L/min.",
      "Posicione la cabeza del paciente en hiperextensión (adulto) o posición neutra (neonato).",
      "Selle la mascarilla con la técnica C-E: dedos en C sobre la mascarilla y dedos en E bajo la mandíbula.",
      "Comprima la bolsa suavemente durante 1 segundo hasta observar elevación del tórax.",
      "Ventile a 10-12 respiraciones/min en adultos o 12-20 en niños.",
      "Después del uso, descontamine la bolsa y la mascarilla según protocolo de desinfección.",
    ],
    laringoscopio: [
      "Verifique que la hoja esté limpia, esterilizada y ensamblada correctamente en el mango.",
      "Encienda la luz de la hoja para confirmar que funciona (luz brillante y estable).",
      "Seleccione el tamaño de hoja adecuado: adulto (Macintosh 3-4), pediátrico (Miller 1-2), neonato (Miller 0).",
      "Coloque al paciente en posición de olfateo (adulto) o neutra (neonato).",
      "Introduzca la hoja por la comisura derecha de la boca desplazando la lengua hacia la izquierda.",
      "Eleve el laringoscopio hacia adelante y arriba para visualizar las cuerdas vocales.",
      "Tras la intubación, retire el laringoscopio y deseche o descontamine la hoja según protocolo.",
    ],
    electrocardio: [
      "Encienda el equipo y verifique que tenga papel térmico suficiente.",
      "Coloque al paciente en decúbito supino con brazos y piernas extendidas.",
      "Limpie y seque las zonas de colocación; aplique gel conductor si es necesario.",
      "Coloque electrodos de extremidades: rojo (RA), amarillo (LA), verde (LL), negro (RL).",
      "Coloque los 6 electrodos precordiales (V1-V6) en las posiciones estándar del tórax.",
      "Solicite al paciente que respire tranquilamente y no se mueva; inicie el registro.",
      "Verifique la calidad del trazado y etiquete el ECG con nombre, fecha, hora y datos del paciente.",
    ],
    esfigmo: [
      "Seleccione el brazalete adecuado: el manguito debe cubrir el 80% de la circunferencia del brazo.",
      "Coloque el brazalete 2-3 cm por encima de la fosa cubital, con la arteria alineada con la marca del manguito.",
      "Palpe la arteria radial e infle hasta que el pulso desaparezca, luego añada 20-30 mmHg más.",
      "Coloque el diafragma del estetoscopio sobre la arteria braquial.",
      "Desinfle lentamente (2-3 mmHg/segundo) escuchando los ruidos de Korotkoff.",
      "El primer ruido es la presión sistólica; el cese del ruido es la presión diastólica.",
      "Registre el resultado con la hora, el brazo utilizado y la posición del paciente.",
    ],
    estetoscopio: [
      "Limpie el diafragma y la campana con alcohol al 70% antes de usar.",
      "Coloque los auriculares inclinados hacia adelante (hacia la nariz) para correcta alineación.",
      "Para auscultación pulmonar: use el diafragma en el tórax anterior y posterior.",
      "Para auscultación cardíaca: use el diafragma para ruidos de alta frecuencia y la campana para los de baja.",
      "Para auscultación abdominal: use el diafragma para escuchar ruidos intestinales.",
      "Mantenga el estetoscopio inmóvil sobre la piel para evitar ruidos artefactuales.",
      "Limpie el estetoscopio con alcohol al 70% después de cada uso y guárdelo libre de nudos.",
    ],
    estetoscopio_pinard: [
      "Limpie el estetoscopio con alcohol antes de su uso.",
      "Coloque el extremo ancho sobre el abdomen de la paciente en el sitio de mayor intensidad del latido fetal.",
      "Apoye el oído en el extremo pequeño sin usar las manos para no interferir con la transmisión del sonido.",
      "Escuche durante al menos 1 minuto contando las pulsaciones.",
      "Compare la frecuencia con el pulso materno para asegurarse de que es el latido fetal.",
      "Registre la frecuencia cardíaca fetal (normal: 120-160 lpm) y cualquier irregularidad.",
    ],
    estuche_diagnostico: [
      "Encienda el otoscopio con el espéculo adecuado para el paciente (adulto o pediátrico).",
      "Para otoscopia: tire suavemente el pabellón auricular hacia arriba y atrás (adulto) o hacia abajo (niño).",
      "Examine el conducto auditivo y la membrana timpánica; observe color, integridad y translucidez.",
      "Para oftalmoscopia: oscurezca la habitación; examine pupila, disco óptico y retina.",
      "Verifique que las pilas tengan carga suficiente para mantener iluminación adecuada.",
      "Limpie los espéculos con solución antiséptica o cámbielos por desechables después de cada uso.",
      "Guarde el estuche en lugar seco y protegido de golpes.",
    ],
    incubadora: [
      "Encienda la incubadora y configure la temperatura objetivo según indicación médica y edad gestacional.",
      "Espere a que alcance la temperatura programada antes de introducir al paciente.",
      "Coloque al neonato en posición adecuada sobre la colchoneta limpia.",
      "Conecte el sensor de temperatura cutáneo en el abdomen del paciente para control en modo servo.",
      "Mantenga las puertas cerradas el mayor tiempo posible para conservar el ambiente térmico.",
      "Verifique la humedad y temperatura cada 30 minutos; registre en la hoja de control.",
      "Para traslado: verifique batería cargada y O2 disponible; fije la incubadora durante el transporte.",
    ],
    marcapasos: [
      "Encienda el marcapasos y verifique que la batería de 9V esté cargada.",
      "Para estimulación transcutánea: coloque el electrodo anterior (cátodo) en el ápex cardíaco y el posterior (ánodo) bajo la escápula izquierda.",
      "Conecte los cables de electrodos al marcapasos (positivo y negativo).",
      "Configure la frecuencia de estimulación (generalmente 60-80 lpm) y la corriente de salida (empiece en 0 y aumente gradualmente).",
      "Verifique la captura efectiva: espiga del marcapasos seguida de un complejo QRS en el monitor.",
      "Ajuste la corriente al umbral mínimo de captura y añada un 10% de seguridad.",
      "Monitorice continuamente el ECG y el estado hemodinámico durante la estimulación.",
    ],
    tanque_oxigeno: [
      "Verifique la presión del tanque en el manómetro (debe ser ≥500 psi para uso de emergencia).",
      "Conecte el regulador al tanque alineando correctamente la rosca; apriete manualmente sin forzar.",
      "Seleccione el flujo de oxígeno indicado girando la perilla del flujómetro.",
      "Conecte la tubería a la mascarilla o cánula nasal del paciente.",
      "Flujos de referencia: mascarilla de no reinhalación 10-15 L/min, cánula nasal 1-6 L/min, BVM 15 L/min.",
      "Al terminar: cierre la válvula del tanque primero, luego libere la presión residual de la manguera.",
      "Registre el nivel de carga al inicio y al final; notifique si baja de 500 psi.",
    ],
    collarin: [
      "Mida el cuello del paciente: la talla correcta va desde el trapecio hasta el ángulo de la mandíbula.",
      "Mantenga la alineación neutral de la columna cervical durante toda la colocación.",
      "Coloque primero la parte posterior bajo el cuello del paciente.",
      "Lleve la parte anterior y alinee el mentón con el apoyo correspondiente del collarín.",
      "Ajuste las tiras de velcro de forma simétrica y firme, pero sin comprimir las venas del cuello.",
      "Verifique que el paciente pueda respirar cómodamente y que la boca no esté forzada a abrirse.",
      "Evalúe perfusión distal y sensibilidad neurológica tras la colocación.",
    ],
    dispositivo_cabeza: [
      "Coloque el dispositivo sobre la camilla rígida o tabla espinal.",
      "Posicione al paciente en decúbito supino con el cuello en alineación neutral sobre el bloque central.",
      "Coloque los bloques laterales a ambos lados de la cabeza sin presionar las orejas.",
      "Fije la correa frontal sobre la frente ajustando con velcro sin comprimir.",
      "Fije la correa de mentón bajo la mandíbula verificando que no obstruya la vía aérea.",
      "Confirme que la cabeza no tenga movimiento lateral, anterior ni posterior.",
      "Reevalúe periódicamente la perfusión y sensibilidad neurológica del paciente.",
    ],
    tabla_compresiones: [
      "Coloque la tabla bajo el torso del paciente, a nivel de los hombros y pelvis.",
      "Verifique que la tabla sea rígida y esté íntegra (sin grietas ni deformaciones).",
      "Fije los cinturones de sujeción alrededor del tórax para evitar movimientos durante las compresiones.",
      "Posicione al reanimador con los brazos perpendiculares al esternón del paciente.",
      "Realice compresiones a una profundidad de 5-6 cm en adultos y 1/3 del diámetro torácico en niños.",
      "Tras el evento, retire la tabla y límpiela con solución desinfectante.",
    ],
    dosificador_o2: [
      "Llene el frasco humidificador con agua destilada hasta la línea de llenado máxima.",
      "Conecte el frasco humidificador al flujómetro de la toma de O2 de la red hospitalaria.",
      "Conecte la tubería del humidificador a la cánula nasal o mascarilla del paciente.",
      "Abra la llave de O2 y ajuste el flujo prescrito (1-6 L/min en cánula, 5-10 en mascarilla).",
      "Verifique que burbujee en el humidificador indicando flujo correcto.",
      "Cambie el agua del humidificador cada 24 horas y la cánula cada 48-72 horas.",
      "Monitorice la SpO2 del paciente y ajuste el flujo según indicación médica.",
    ],
    termometro: [
      "Coloque un protector desechable en la sonda antes de cada uso.",
      "Encienda el termómetro y espere el tono de listo.",
      "Para temperatura axilar: coloque la sonda en el hueco axilar y solicite que baje el brazo; espere la señal sonora.",
      "Para temperatura timpánica: introduzca suavemente la sonda en el canal auditivo apuntando al tímpano.",
      "Lea el resultado en la pantalla y retírelo al escuchar el tono de fin.",
      "Retire el protector desechable y descártelo como residuo biológico.",
      "Registre la temperatura, hora y vía de medición en el expediente del paciente.",
    ],
    negatoscopio: [
      "Conecte el cable de alimentación y encienda el panel de iluminación.",
      "Limpie el panel de cristal con un paño seco antes de colocar las radiografías.",
      "Coloque las placas radiográficas centradas en el panel con la cara de emulsión hacia el observador.",
      "Posiciónese a 30-50 cm del panel para una correcta visualización.",
      "Apague el negatoscopio al terminar y retire las placas.",
      "Limpie el panel con paño húmedo si hay residuos de marcadores u otros contaminantes.",
    ],
    cama_barandales: [
      "Verifique que los frenos de las ruedas estén activos antes de trasladar al paciente.",
      "Baje los barandales del lado de entrada; suba los barandales al terminar el traslado.",
      "Ajuste la altura de la cama a nivel de la cintura del cuidador para el cuidado.",
      "Ajuste la posición de la cabecera según indicación médica (30° para pacientes con riesgo de aspiración).",
      "Verifique periódicamente que los barandales estén bien encajados y los frenos activos.",
      "Cambie ropa de cama mínimo cada 24 horas o inmediatamente si hay contaminación.",
    ],
    equipo_sutura: [
      "Verifique la esterilidad del instrumental antes de abrir los paquetes.",
      "Prepare el campo estéril y coloque el instrumental con técnica aséptica.",
      "Limpie y desinfecte la herida con solución antiséptica antes de iniciar.",
      "Aplique anestesia local según indicación médica y espere efecto (2-5 minutos).",
      "Realice la sutura con el portaagujas cargado con hilo y aguja adecuados para el tipo de tejido.",
      "Anude con seguridad y corte los cabos del hilo dejando 3-4 mm de longitud.",
      "Cubra con apósito estéril y registre el procedimiento con tipo y número de puntos.",
    ],
    carro_curaciones: [
      "Verifique que el carro esté limpio y bien surtido antes de cada turno.",
      "Realice higiene de manos y colóquese guantes antes de preparar el material.",
      "Prepare la solución antiséptica y los apósitos necesarios según el tipo de herida.",
      "Limpie la herida con suero fisiológico o solución antiséptica de adentro hacia afuera.",
      "Retire tejido necrótico o costras si está indicado con instrumental estéril.",
      "Aplique el apósito adecuado y fije con cinta adhesiva o venda de gasa.",
      "Registre el estado de la herida, material utilizado y fecha de próxima curación.",
    ],
    sierra_yeso: [
      "Verifique que la hoja de sierra esté en buenas condiciones y bien fijada.",
      "Coloque protectores auditivos al paciente y al operador.",
      "Corte el yeso con movimientos de vaivén (no circulares) para evitar lesionar la piel.",
      "Alterne puntos de corte a lo largo del yeso para distribuir el calor.",
      "Use la cizalla para separar los bordes del yeso y la gubia para abrir el vendaje de algodón.",
      "Retire el yeso con cuidado y verifique la integridad de la piel subyacente.",
      "Limpie la sierra con paño seco y guárdela en su estuche protector.",
    ],
    lampara: [
      "Conecte el cable de alimentación y encienda la lámpara.",
      "Dirija el haz de luz hacia la zona de trabajo ajustando el brazo articulado.",
      "Verifique que la luz sea homogénea y sin parpadeos (indicativo de foco en buen estado).",
      "Mantenga la lámpara alejada de materiales inflamables.",
      "Apague la lámpara cuando no esté en uso para prolongar la vida del foco.",
      "Limpie el reflector con paño seco; no use líquidos directamente sobre el foco.",
    ],
    bascula_estadimetro: [
      "Coloque la báscula en una superficie plana y nivelada; compruebe que marque cero.",
      "Solicite al paciente que retire zapatos, chamarras y objetos pesados de los bolsillos.",
      "Pida al paciente que suba al centro de la plataforma sin apoyarse en nada.",
      "Lea el peso cuando la pantalla se estabilice y registre el resultado.",
      "Para medir la talla: pida al paciente que se coloque erguido, talones juntos y mirando al frente.",
      "Baje la paleta del estadímetro hasta el vértice del cráneo y registre la medida.",
      "Calcule el IMC si está indicado (peso kg / talla m²).",
    ],
    bascula_bebe: [
      "Coloque el cobertor de charola limpio para higiene y comodidad del neonato.",
      "Encienda la báscula y realice el tarado (ponga a cero con el cobertor puesto).",
      "Coloque al neonato completamente desnudo en el centro de la charola.",
      "Mantenga una mano cerca del bebé sin tocarlo hasta que la pantalla se estabilice.",
      "Lea y registre el peso con hora de medición.",
      "Retire al neonato, limpie la charola con solución antiséptica y cambie el cobertor.",
    ],
    mesa_exploracion: [
      "Forre la superficie con papel o cobertor limpio antes de cada paciente.",
      "Ajuste la altura de la mesa y use el escalón si el paciente lo necesita.",
      "Para examen ginecológico: despliegue los estribos a la altura adecuada.",
      "Indique al paciente cómo subir y posicionarse correctamente.",
      "Conserve la privacidad del paciente con batas o sábanas durante el examen.",
      "Al terminar, baje los estribos, retire el papel y limpie la superficie con desinfectante.",
    ],
    camilla: [
      "Verifique que los frenos estén activos antes de transferir al paciente.",
      "Baje los barandales del lado de entrada para facilitar el traslado.",
      "Coloque al paciente en posición cómoda y suba los barandales de inmediato.",
      "Fije los cinturones de seguridad durante el traslado.",
      "Conduzca la camilla desde el extremo de la cabeza empujando con cuidado.",
      "Al llegar al destino, active los frenos y baje los barandales antes de transferir al paciente.",
    ],
    mascarilla_o2: [
      "Seleccione el tamaño correcto: adulto o pediátrico según el paciente.",
      "Ajuste la banda elástica detrás de las orejas o la nuca del paciente.",
      "Moldee el clip metálico sobre el puente nasal para evitar fugas de oxígeno.",
      "Conecte la tubería a la fuente de O2 y ajuste el flujo indicado.",
      "Verifique que la mascarilla cubra completamente nariz y boca sin presionar los ojos.",
      "Cambie la mascarilla cada 24-48 horas o de inmediato si está contaminada.",
    ],
    portavenoclisis: [
      "Ajuste la altura del soporte (generalmente 1 metro por encima del punto de inserción IV).",
      "Cuelgue la solución IV del gancho y verifique que el frasco o bolsa esté sin fugas.",
      "Fije la bomba de infusión o el equipo de goteo al soporte.",
      "Deslice el portavenoclisis cuidadosamente al mover al paciente para evitar jalones en la vía.",
      "Active los frenos del soporte cuando esté en posición fija.",
    ],
    pinza_traslado: [
      "Mantenga la pinza dentro de su contenedor estéril con solución antiséptica entre usos.",
      "Tome la pinza por el mango sin tocar la zona de trabajo.",
      "Use la pinza para transferir gasas, compresas y material estéril al campo de trabajo.",
      "No utilice la pinza para colocar catéteres, sondas ni objetos contaminados.",
      "Cambie la solución antiséptica del contenedor cada turno (8-12 horas).",
      "Envíe la pinza a esterilización cada 24 horas o cuando esté visiblemente contaminada.",
    ],
    banco_altura: [
      "Coloque el banco en una superficie plana y estable.",
      "Verifique que la base antideslizante esté en buen estado.",
      "Coloque el banco frente a la camilla o mesa de exploración.",
      "Indique al paciente que suba con precaución sosteniéndose de la camilla.",
      "Retire el banco una vez que el paciente esté en la posición correcta.",
    ],
    mesa_mayo_pasteur: [
      "Limpie la charola con solución desinfectante antes de cada uso.",
      "Ajuste la altura de la mesa según la necesidad del procedimiento.",
      "Coloque el instrumental o material estéril con técnica aséptica.",
      "Posicione la mesa a la derecha del campo de trabajo.",
      "Retire y limpie la mesa inmediatamente después del procedimiento.",
    ],
    mesa_karam: [
      "Verifique que la colchoneta esté limpia y sin roturas.",
      "Ajuste la posición de la mesa según el procedimiento a realizar.",
      "Coloque al paciente pediátrico con cuidado, asegurando los cinturones laterales.",
      "Verifique periódicamente que el paciente esté cómodo y seguro durante el procedimiento.",
      "Limpie la colchoneta con desinfectante al terminar y antes del siguiente paciente.",
    ],
  };

  const deviceMappings: Array<{
    id: string;
    acc: keyof typeof ACC;
    guia: keyof typeof GUIAS;
  }> = [
    // Central de Enfermeras
    { id: "eq_enf_05", acc: "bvm_adulto", guia: "bvm" },
    { id: "eq_enf_07", acc: "bvm_neonato", guia: "bvm" },
    { id: "eq_enf_06", acc: "bvm_pediatrico", guia: "bvm" },
    { id: "eq_hid_01", acc: "bascula_bebe", guia: "bascula_bebe" },
    { id: "eq_enf_01", acc: "carro_rojo_adulto", guia: "carro_rojo_adulto" },
    { id: "eq_enf_02", acc: "carro_rojo_pediatrico", guia: "carro_rojo_pediatrico" },
    { id: "eq_enf_13", acc: "collarin", guia: "collarin" },
    { id: "eq_enf_15", acc: "collarin", guia: "collarin" },
    { id: "eq_enf_14", acc: "collarin", guia: "collarin" },
    { id: "eq_enf_03", acc: "desfibrilador", guia: "desfibrilador" },
    { id: "eq_enf_16", acc: "dispositivo_cabeza", guia: "dispositivo_cabeza" },
    { id: "eq_enf_04", acc: "electrocardio", guia: "electrocardio" },
    { id: "eq_enf_17", acc: "esfigmo_pediatrico", guia: "esfigmo" },
    { id: "eq_enf_18", acc: "estetoscopio", guia: "estetoscopio" },
    { id: "eq_enf_19", acc: "estetoscopio_pediatrico", guia: "estetoscopio" },
    { id: "eq_enf_20", acc: "estuche_diagnostico", guia: "estuche_diagnostico" },
    { id: "eq_enf_21", acc: "incubadora_traslado", guia: "incubadora" },
    { id: "eq_enf_22", acc: "incubadora_general", guia: "incubadora" },
    { id: "eq_enf_08", acc: "laringoscopio_adulto", guia: "laringoscopio" },
    { id: "eq_enf_09", acc: "laringoscopio_pediatrico", guia: "laringoscopio" },
    { id: "eq_enf_23", acc: "lampara", guia: "lampara" },
    { id: "eq_enf_10", acc: "marcapasos", guia: "marcapasos" },
    { id: "eq_enf_28", acc: "mascarilla_o2", guia: "mascarilla_o2" },
    { id: "eq_enf_29", acc: "mascarilla_o2", guia: "mascarilla_o2" },
    { id: "eq_enf_26", acc: "mesa_mayo", guia: "mesa_mayo_pasteur" },
    { id: "eq_enf_27", acc: "mesa_pasteur", guia: "mesa_mayo_pasteur" },
    { id: "eq_enf_24", acc: "pinza_traslado", guia: "pinza_traslado" },
    { id: "eq_enf_25", acc: "portavenoclisis", guia: "portavenoclisis" },
    { id: "eq_enf_11", acc: "tabla_compresiones", guia: "tabla_compresiones" },
    { id: "eq_enf_12", acc: "tanque_oxigeno", guia: "tanque_oxigeno" },
    // Consultorio / Valoración
    { id: "eq_val_10", acc: "banco_altura", guia: "banco_altura" },
    { id: "eq_val_02", acc: "bascula_bebe", guia: "bascula_bebe" },
    { id: "eq_val_01", acc: "bascula_estadimetro", guia: "bascula_estadimetro" },
    { id: "eq_val_03", acc: "esfigmo", guia: "esfigmo" },
    { id: "eq_val_04", acc: "estetoscopio", guia: "estetoscopio" },
    { id: "eq_val_05", acc: "estetoscopio_pinard", guia: "estetoscopio_pinard" },
    { id: "eq_val_06", acc: "estuche_diagnostico", guia: "estuche_diagnostico" },
    { id: "eq_val_07", acc: "lampara", guia: "lampara" },
    { id: "eq_val_09", acc: "mesa_exploracion", guia: "mesa_exploracion" },
    { id: "eq_val_08", acc: "negatoscopio", guia: "negatoscopio" },
    // Quirófano 1
    { id: "cmmk1lmux000b8qfhetpk5uqq", acc: "monitor_signos", guia: "monitor_signos" },
    // Sala de Choque
    { id: "eq_cho_11", acc: "bvm_adulto", guia: "bvm" },
    { id: "eq_cho_01", acc: "camilla", guia: "camilla" },
    { id: "eq_cho_03", acc: "carro_rojo_adulto", guia: "carro_rojo_adulto" },
    { id: "eq_cho_10", acc: "carro_curaciones", guia: "carro_curaciones" },
    { id: "eq_cho_04", acc: "desfibrilador", guia: "desfibrilador" },
    { id: "eq_cho_08", acc: "equipo_sutura", guia: "equipo_sutura" },
    { id: "eq_cho_05", acc: "esfigmo", guia: "esfigmo" },
    { id: "eq_cho_06", acc: "estetoscopio", guia: "estetoscopio" },
    { id: "eq_cho_07", acc: "estuche_diagnostico", guia: "estuche_diagnostico" },
    { id: "eq_cho_12", acc: "laringoscopio_adulto", guia: "laringoscopio" },
    { id: "eq_cho_09", acc: "lampara", guia: "lampara" },
    { id: "eq_cho_13", acc: "marcapasos", guia: "marcapasos" },
    { id: "eq_cho_17", acc: "mesa_pasteur", guia: "mesa_mayo_pasteur" },
    { id: "eq_cho_02", acc: "monitor_signos", guia: "monitor_signos" },
    { id: "eq_cho_16", acc: "portavenoclisis", guia: "portavenoclisis" },
    { id: "eq_cho_14", acc: "tabla_compresiones", guia: "tabla_compresiones" },
    { id: "eq_cho_15", acc: "tanque_oxigeno", guia: "tanque_oxigeno" },
    // Sala de Curaciones y Yesos
    { id: "eq_cur_05", acc: "carro_curaciones", guia: "carro_curaciones" },
    { id: "eq_cur_01", acc: "equipo_sutura", guia: "equipo_sutura" },
    { id: "eq_cur_02", acc: "lampara", guia: "lampara" },
    { id: "eq_cur_07", acc: "mesa_pasteur", guia: "mesa_mayo_pasteur" },
    { id: "eq_cur_06", acc: "mesa_exploracion", guia: "mesa_exploracion" },
    { id: "eq_cur_03", acc: "negatoscopio", guia: "negatoscopio" },
    { id: "eq_cur_08", acc: "portavenoclisis", guia: "portavenoclisis" },
    { id: "eq_cur_04", acc: "sierra_yeso", guia: "sierra_yeso" },
    // UCI
    { id: "cmmk1lmuz000c8qfhmrvj5ypb", acc: "ventilador", guia: "ventilador" },
    // Urgencias
    { id: "cmmk1lmv1000d8qfhra47ft17", acc: "desfibrilador", guia: "desfibrilador" },
    // Área de Hidratación Pediátrica
    { id: "eq_hid_03", acc: "esfigmo_pediatrico", guia: "esfigmo" },
    { id: "eq_hid_04", acc: "estetoscopio", guia: "estetoscopio" },
    { id: "eq_hid_05", acc: "mesa_karam", guia: "mesa_karam" },
    // Área de Observación — Camas
    { id: "eq_obs_09", acc: "cama_barandales", guia: "cama_barandales" },
    { id: "eq_obs_10", acc: "cama_barandales", guia: "cama_barandales" },
    { id: "eq_obs_11", acc: "cama_barandales", guia: "cama_barandales" },
    { id: "eq_obs_12", acc: "cama_barandales", guia: "cama_barandales" },
    // Área de Observación — Dosificadores
    { id: "eq_obs_01", acc: "dosificador_o2", guia: "dosificador_o2" },
    { id: "eq_obs_02", acc: "dosificador_o2", guia: "dosificador_o2" },
    { id: "eq_obs_03", acc: "dosificador_o2", guia: "dosificador_o2" },
    { id: "eq_obs_04", acc: "dosificador_o2", guia: "dosificador_o2" },
    // Área de Observación — Portavenoclisis
    { id: "eq_obs_13", acc: "portavenoclisis", guia: "portavenoclisis" },
    { id: "eq_obs_14", acc: "portavenoclisis", guia: "portavenoclisis" },
    { id: "eq_obs_15", acc: "portavenoclisis", guia: "portavenoclisis" },
    { id: "eq_obs_16", acc: "portavenoclisis", guia: "portavenoclisis" },
    // Área de Observación — Termómetros
    { id: "eq_obs_05", acc: "termometro", guia: "termometro" },
    { id: "eq_obs_06", acc: "termometro", guia: "termometro" },
    { id: "eq_obs_07", acc: "termometro", guia: "termometro" },
    { id: "eq_obs_08", acc: "termometro", guia: "termometro" },
    // Sin ubicación
    { id: "cmmk1lmv2000e8qfha6snomxc", acc: "bomba_infusion", guia: "bomba_infusion" },
    { id: "eq_hid_02", acc: "dosificador_o2", guia: "dosificador_o2" },
  ];

  console.log("Cargando accesorios...");
  for (const { id, acc } of deviceMappings) {
    await addAccesorios(id, ACC[acc]);
  }

  console.log("\nCargando guías rápidas...");
  for (const { id, guia } of deviceMappings) {
    await addGuia(id, GUIAS[guia]);
  }

  console.log("\nCarga completada!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
