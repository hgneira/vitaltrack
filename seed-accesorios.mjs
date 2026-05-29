import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Accesorios por nombre de equipo (lowercase key)
// { nombre, requerido }
const ACCESORIOS = {
  "monitor multiparámetros": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Módulo SpO₂ con sensor de dedo adulto", requerido: true },
    { nombre: "Brazalete PANI adulto (talla M)", requerido: true },
    { nombre: "Brazalete PANI adulto (talla L)", requerido: false },
    { nombre: "Cable ECG 5 derivaciones", requerido: true },
    { nombre: "Electrodos desechables ECG", requerido: true },
    { nombre: "Sensor de temperatura esofágico/dérmico", requerido: false },
    { nombre: "Cable IBP (presión invasiva)", requerido: false },
    { nombre: "Soporte de montaje/poste", requerido: true },
    { nombre: "Manual de usuario", requerido: false },
  ],
  "monitor multiparámetros pediátrico": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Sensor SpO₂ neonatal/pediátrico", requerido: true },
    { nombre: "Brazalete PANI neonatal", requerido: true },
    { nombre: "Brazalete PANI pediátrico (talla S)", requerido: true },
    { nombre: "Cable ECG 3 derivaciones pediátrico", requerido: true },
    { nombre: "Electrodos pediátricos", requerido: true },
    { nombre: "Sensor de temperatura pediátrico", requerido: false },
    { nombre: "Soporte de montaje/poste", requerido: true },
    { nombre: "Manual de usuario", requerido: false },
  ],
  "ventilador mecánico": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Circuito de paciente adulto (mangueras inspiratoria y espiratoria)", requerido: true },
    { nombre: "Trampa de agua (2 piezas)", requerido: true },
    { nombre: "Filtro antibacteriano HME", requerido: true },
    { nombre: "Sensor de flujo proximal", requerido: true },
    { nombre: "Manguera de oxígeno (DISS O₂)", requerido: true },
    { nombre: "Manguera de aire comprimido (DISS aire)", requerido: true },
    { nombre: "Cámara humidificadora", requerido: false },
    { nombre: "Agua destilada estéril para humidificador", requerido: false },
    { nombre: "Bolsa resucitadora manual de respaldo", requerido: true },
    { nombre: "Batería interna de respaldo", requerido: true },
    { nombre: "Manual de operación", requerido: false },
  ],
  "desfibrilador/cardioversor": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Batería recargable", requerido: true },
    { nombre: "Paletas externas adulto", requerido: true },
    { nombre: "Paletas externas pediátricas", requerido: true },
    { nombre: "Electrodos de terapia desechables adulto", requerido: true },
    { nombre: "Electrodos de terapia desechables pediátrico", requerido: false },
    { nombre: "Cable ECG 3 derivaciones", requerido: true },
    { nombre: "Gel conductor", requerido: true },
    { nombre: "Papel térmico para registro", requerido: true },
    { nombre: "Cable de marcapaso externo (si aplica)", requerido: false },
    { nombre: "Maletín de transporte", requerido: false },
  ],
  "desfibrilador dea": [
    { nombre: "Electrodos de terapia adulto (parche adhesivo)", requerido: true },
    { nombre: "Electrodos de terapia pediátrico (parche adhesivo)", requerido: false },
    { nombre: "Batería", requerido: true },
    { nombre: "Maletín o funda de transporte", requerido: true },
    { nombre: "Navaja/tijeras para ropa", requerido: true },
    { nombre: "Maquinilla desechable (rasurado)", requerido: true },
    { nombre: "Guantes de látex", requerido: true },
    { nombre: "Máscara de barrera para RCP", requerido: true },
    { nombre: "Manual de usuario / guía rápida", requerido: false },
  ],
  "bomba de infusión": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Batería recargable interna", requerido: true },
    { nombre: "Set de infusión compatible (macrogotero)", requerido: true },
    { nombre: "Set de extensión IV", requerido: false },
    { nombre: "Poste IV / soporte de montaje", requerido: true },
    { nombre: "Llave de tres vías", requerido: false },
    { nombre: "Manual de usuario", requerido: false },
  ],
  "bomba de infusión pediátrica": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Batería recargable interna", requerido: true },
    { nombre: "Set de infusión pediátrico (microgotero)", requerido: true },
    { nombre: "Set de extensión IV pediátrico", requerido: false },
    { nombre: "Poste IV / soporte de montaje", requerido: true },
    { nombre: "Filtro de línea 0.2 µm", requerido: false },
    { nombre: "Manual de usuario", requerido: false },
  ],
  "oxímetro de pulso": [
    { nombre: "Cable de alimentación / cargador", requerido: true },
    { nombre: "Sensor de dedo adulto reutilizable", requerido: true },
    { nombre: "Sensor de dedo desechable (varios)", requerido: false },
    { nombre: "Cable de extensión del sensor", requerido: false },
    { nombre: "Pilas AA (si aplica)", requerido: false },
    { nombre: "Correa de muñeca / clip de bolsillo", requerido: false },
  ],
  "oxímetro de pulso pediátrico": [
    { nombre: "Cable de alimentación / cargador", requerido: true },
    { nombre: "Sensor neonatal de dedo/pie", requerido: true },
    { nombre: "Sensor pediátrico (talla S)", requerido: true },
    { nombre: "Cable de extensión del sensor", requerido: false },
  ],
  "glucómetro": [
    { nombre: "Tiras reactivas (caja 50 u.)", requerido: true },
    { nombre: "Lancetador automático", requerido: true },
    { nombre: "Lancetas (caja 100 u.)", requerido: true },
    { nombre: "Solución de control (nivel bajo y alto)", requerido: true },
    { nombre: "Pilas AAA", requerido: true },
    { nombre: "Estuche de transporte", requerido: false },
    { nombre: "Guantes desechables", requerido: true },
    { nombre: "Torundas de algodón / alcohol", requerido: true },
  ],
  "aspirador de secreciones": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Frasco colector de 1 L", requerido: true },
    { nombre: "Trampa de líquidos / filtro bacteriano", requerido: true },
    { nombre: "Manguera de silicón de conexión", requerido: true },
    { nombre: "Catéter de aspiración Yankauer", requerido: true },
    { nombre: "Catéter de aspiración flexible (varios calibres)", requerido: true },
    { nombre: "Conector en Y", requerido: false },
  ],
  "aspirador portátil": [
    { nombre: "Batería recargable", requerido: true },
    { nombre: "Cargador de batería", requerido: true },
    { nombre: "Frasco colector 300 mL", requerido: true },
    { nombre: "Filtro bacteriano", requerido: true },
    { nombre: "Manguera de paciente", requerido: true },
    { nombre: "Catéter Yankauer", requerido: true },
    { nombre: "Bolsa de transporte", requerido: false },
  ],
  "aspirador quirúrgico": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Frasco colector 2 L", requerido: true },
    { nombre: "Manguera de silicón quirúrgica", requerido: true },
    { nombre: "Filtro bacteriano de alta eficiencia", requerido: true },
    { nombre: "Punta de succión quirúrgica (Frazier, Poole)", requerido: true },
    { nombre: "Trampa de líquidos", requerido: true },
  ],
  "equipo de ultrasonido": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Transductor convexo 3.5–5 MHz (abdominal)", requerido: true },
    { nombre: "Transductor lineal 7.5–12 MHz (partes blandas/vascular)", requerido: true },
    { nombre: "Transductor sectorial (cardiaco)", requerido: false },
    { nombre: "Transductor transvaginal", requerido: false },
    { nombre: "Gel para ultrasonido (litro)", requerido: true },
    { nombre: "Impresora térmica de imágenes", requerido: false },
    { nombre: "Papel térmico para impresora", requerido: false },
    { nombre: "Fundas estériles para transductor", requerido: false },
    { nombre: "Cable de vídeo / USB para exportar imágenes", requerido: false },
    { nombre: "Soporte / pedestal con ruedas", requerido: true },
  ],
  "electrocauterio": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Lápiz electroquirúrgico monopolar", requerido: true },
    { nombre: "Placa dispersiva (electrodos de retorno adulto)", requerido: true },
    { nombre: "Placa dispersiva pediátrica", requerido: false },
    { nombre: "Pedal de activación", requerido: true },
    { nombre: "Cable del lápiz", requerido: true },
    { nombre: "Cable de la placa dispersiva", requerido: true },
    { nombre: "Puntas de electrodo desechables (corte y coagulación)", requerido: true },
    { nombre: "Pinza bipolar", requerido: false },
    { nombre: "Cable bipolar", requerido: false },
  ],
  "carro de paro cardiorrespiratorio": [
    { nombre: "Bolsa resucitadora manual adulto (Ambu)", requerido: true },
    { nombre: "Bolsa resucitadora pediátrica", requerido: true },
    { nombre: "Mascarillas faciales (tallas 3, 4, 5)", requerido: true },
    { nombre: "Laringoscopio con hoja curva McIntosh #3 y #4", requerido: true },
    { nombre: "Laringoscopio con hoja recta Miller #2", requerido: false },
    { nombre: "Tubos endotraqueales (6.0, 7.0, 7.5, 8.0 mm)", requerido: true },
    { nombre: "Guía de intubación (estilete)", requerido: true },
    { nombre: "Tabla de RCP / plano duro", requerido: true },
    { nombre: "Jeringa 10 mL (para globo del tubo ET)", requerido: true },
    { nombre: "Cánulas orofaríngeas Guedel (tallas 3, 4, 5)", requerido: true },
    { nombre: "Cinta adhesiva para fijación del tubo", requerido: true },
    { nombre: "Tijeras de trauma", requerido: true },
    { nombre: "Guantes estériles (tallas S, M, L)", requerido: true },
    { nombre: "Medicamentos de emergencia (adrenalina, atropina, amiodarona, etc.)", requerido: true },
    { nombre: "Catéteres IV (14G, 16G, 18G)", requerido: true },
    { nombre: "Solución salina 0.9% 500 mL", requerido: true },
    { nombre: "Equipo de venoclisis", requerido: true },
    { nombre: "Torniquete", requerido: true },
    { nombre: "Oxímetro de pulso portátil", requerido: true },
    { nombre: "Glucómetro con tiras", requerido: true },
  ],
  "laringoscopio de video": [
    { nombre: "Mango del laringoscopio (batería integrada)", requerido: true },
    { nombre: "Cargador / cable USB", requerido: true },
    { nombre: "Hoja desechable #3 (adulto mediano)", requerido: true },
    { nombre: "Hoja desechable #4 (adulto grande)", requerido: true },
    { nombre: "Hoja pediátrica #2", requerido: false },
    { nombre: "Guía de intubación (estilete articulado)", requerido: true },
    { nombre: "Estuche de transporte", requerido: false },
  ],
  "calentador de fluidos iv": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Set de infusión calefactado compatible", requerido: true },
    { nombre: "Soporte de montaje / poste IV", requerido: true },
  ],
  "tensiómetro digital": [
    { nombre: "Cable de alimentación / adaptador AC", requerido: true },
    { nombre: "Pilas AA", requerido: false },
    { nombre: "Brazalete adulto (22–32 cm, talla M)", requerido: true },
    { nombre: "Brazalete adulto grande (32–42 cm, talla L)", requerido: false },
    { nombre: "Brazalete pediátrico", requerido: false },
    { nombre: "Manguera de conexión brazalete–monitor", requerido: true },
    { nombre: "Estuche de transporte", requerido: false },
  ],
  "termómetro infrarrojo": [
    { nombre: "Pilas AAA", requerido: true },
    { nombre: "Funda protectora", requerido: false },
    { nombre: "Paños de limpieza con alcohol (isopropílico 70%)", requerido: true },
  ],
  "equipo de rayos x digital": [
    { nombre: "Cable de alimentación principal", requerido: true },
    { nombre: "Panel detector digital (DR flat panel)", requerido: true },
    { nombre: "Cable de datos / Ethernet del detector", requerido: true },
    { nombre: "Chaleco de plomo para personal (2 u.)", requerido: true },
    { nombre: "Delantal de plomo para paciente", requerido: true },
    { nombre: "Protector gonadal", requerido: true },
    { nombre: "Estación de trabajo / workstation", requerido: true },
    { nombre: "Software de adquisición de imágenes", requerido: true },
    { nombre: "UPS / regulador de voltaje", requerido: true },
  ],
  "chaleco de plomo": [
    { nombre: "Cinturón ajustable", requerido: true },
    { nombre: "Funda protectora de tela exterior", requerido: false },
    { nombre: "Percha/colgador para almacenamiento horizontal", requerido: true },
  ],
  "delantal de plomo": [
    { nombre: "Broches de velcro / cinturón de ajuste", requerido: true },
    { nombre: "Percha para almacenamiento", requerido: true },
  ],
  "microscopio binocular": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Objetivos (4x, 10x, 40x, 100x)", requerido: true },
    { nombre: "Oculares (par 10x)", requerido: true },
    { nombre: "Aceite de inmersión", requerido: true },
    { nombre: "Cubreobjetos y portaobjetos", requerido: true },
    { nombre: "Foco de luz halógena / LED de repuesto", requerido: false },
    { nombre: "Papel de limpieza óptica", requerido: true },
    { nombre: "Cubierta protectora antipolvo", requerido: false },
    { nombre: "Pinza para portaobjetos", requerido: true },
  ],
  "centrífuga clínica": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Rotor de ángulo fijo (12 tubos 10 mL)", requerido: true },
    { nombre: "Tubos de ensayo de 10 mL (adaptadores)", requerido: true },
    { nombre: "Tubos capilares para microhematocrito (rotor)", requerido: false },
    { nombre: "Tapas de seguridad del rotor", requerido: true },
    { nombre: "Adaptadores para tubos de diferentes tamaños", requerido: false },
    { nombre: "Cubierta protectora", requerido: false },
  ],
  "centrífuga refrigerada": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Rotor de ángulo fijo para tubos de 50 mL", requerido: true },
    { nombre: "Rotor para tubos de 1.5 mL (microcentrífuga)", requerido: false },
    { nombre: "Adaptadores para tubos de distintas capacidades", requerido: true },
    { nombre: "Tapas de seguridad del rotor", requerido: true },
  ],
  "analizador hematológico": [
    { nombre: "Reactivo diluyente (diluent)", requerido: true },
    { nombre: "Reactivo lisante (lyse)", requerido: true },
    { nombre: "Solución de limpieza (cleaner)", requerido: true },
    { nombre: "Control de baja concentración", requerido: true },
    { nombre: "Control de concentración normal", requerido: true },
    { nombre: "Control de alta concentración", requerido: true },
    { nombre: "Tubo de vacío EDTA K3 (morado)", requerido: true },
    { nombre: "Impresora de resultados / papel térmico", requerido: false },
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Cable de conexión a LIS / interfaz", requerido: false },
  ],
  "analizador de gases sanguíneos": [
    { nombre: "Cartuchos de análisis (iSTAT o similar)", requerido: true },
    { nombre: "Jeringas para gases arteriales heparinizadas", requerido: true },
    { nombre: "Solución de calibración", requerido: true },
    { nombre: "Solución de limpieza", requerido: true },
    { nombre: "Cable de alimentación / base de carga", requerido: true },
    { nombre: "Cable de descarga a LIS", requerido: false },
  ],
  "analizador de electrolitos": [
    { nombre: "Electrodos de Na⁺, K⁺, Cl⁻, iCa²⁺", requerido: true },
    { nombre: "Solución de calibración (nivel 1 y 2)", requerido: true },
    { nombre: "Solución de lavado / limpieza", requerido: true },
    { nombre: "Tubos capilares o jeringa de muestra", requerido: true },
    { nombre: "Cable de alimentación", requerido: true },
  ],
  "coagulómetro": [
    { nombre: "Reactivo de tromboplastina (PT/INR)", requerido: true },
    { nombre: "Reactivo APTT", requerido: true },
    { nombre: "Plasma control normal", requerido: true },
    { nombre: "Plasma control patológico", requerido: true },
    { nombre: "Cubetas desechables", requerido: true },
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Papel de impresora", requerido: false },
  ],
  "agitador de plaquetas": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Cubetas / bolsas de almacenamiento de plaquetas", requerido: true },
    { nombre: "Termómetro de control de temperatura", requerido: true },
    { nombre: "Registro de temperatura", requerido: true },
  ],
  "refrigerador de medicamentos": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Termómetro de máxima y mínima", requerido: true },
    { nombre: "Registro de temperaturas (hoja de control)", requerido: true },
    { nombre: "Organizadores / charolas interiores", requerido: true },
    { nombre: "Llave de seguridad", requerido: true },
  ],
  "refrigerador para hemoderivados": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Termómetro de precisión (±0.5 °C)", requerido: true },
    { nombre: "Alarma de temperatura", requerido: true },
    { nombre: "Registro de temperaturas", requerido: true },
    { nombre: "Organizadores / bandejas interiores", requerido: true },
    { nombre: "Llave de seguridad", requerido: true },
    { nombre: "UPS de respaldo eléctrico", requerido: true },
  ],
  "lámpara de exploración": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Base con ruedas (si es rodable)", requerido: true },
    { nombre: "Foco halógeno / LED de repuesto", requerido: false },
    { nombre: "Brazo articulado funcional", requerido: true },
  ],
  "lámpara de exploración led": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Base con ruedas", requerido: true },
    { nombre: "Control de intensidad luminosa", requerido: true },
    { nombre: "Brazo articulado funcional", requerido: true },
  ],
  "lámpara de calor radiante": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Sensor de temperatura de piel neonatal", requerido: true },
    { nombre: "Colchoneta / almohada neonatal", requerido: true },
    { nombre: "Oxímetro neonatal integrado (si aplica)", requerido: false },
    { nombre: "Soporte IV lateral", requerido: false },
  ],
  "compresor de rcp mecánico": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Batería recargable", requerido: true },
    { nombre: "Cargador de batería", requerido: true },
    { nombre: "Banda de compresión / pistón", requerido: true },
    { nombre: "Almohadilla de respaldo", requerido: true },
    { nombre: "Tabla de soporte rígido", requerido: true },
    { nombre: "Bolsa de transporte", requerido: false },
  ],
  "negatoscopio led": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Clips sujetadores de radiografías", requerido: true },
    { nombre: "Sujeción de montaje en pared / soporte", requerido: true },
  ],
  "báscula digital": [
    { nombre: "Cable de alimentación / pilas", requerido: true },
    { nombre: "Plataforma de peso", requerido: true },
    { nombre: "Tallímetro (si integrado)", requerido: false },
    { nombre: "Tara / recipiente para pesar neonatos", requerido: false },
    { nombre: "Impresora de etiquetas (si aplica)", requerido: false },
  ],
  "báscula para medicamentos": [
    { nombre: "Pilas AA / cable de alimentación", requerido: true },
    { nombre: "Plato de pesaje", requerido: true },
    { nombre: "Pesos de calibración (set)", requerido: true },
    { nombre: "Tara / bandeja", requerido: false },
  ],
  "camilla de transporte": [
    { nombre: "Colchoneta de espuma", requerido: true },
    { nombre: "Barandales de seguridad laterales (x2)", requerido: true },
    { nombre: "Correas de sujeción de paciente (x3)", requerido: true },
    { nombre: "Soporte de suero IV", requerido: true },
    { nombre: "Frenos de ruedas", requerido: true },
    { nombre: "Gancho para bolsa de drenaje", requerido: false },
    { nombre: "Portamonitor (soporte integrado)", requerido: false },
  ],
  "silla de ruedas plegable": [
    { nombre: "Reposapiés desmontables (x2)", requerido: true },
    { nombre: "Reposabrazos desmontables (x2)", requerido: true },
    { nombre: "Cinturón de seguridad / abdominal", requerido: true },
    { nombre: "Frenos de ruedas traseras", requerido: true },
    { nombre: "Cojín de asiento antiescaras", requerido: false },
    { nombre: "Bolsa trasera de almacenamiento", requerido: false },
  ],
  "carro de transporte de equipos": [
    { nombre: "Ruedas con freno", requerido: true },
    { nombre: "Charolas / bandejas organizadoras", requerido: true },
    { nombre: "Riel lateral para equipos", requerido: false },
    { nombre: "Compartimento con llave", requerido: false },
  ],
  "sierra oscilante para yesos": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Hoja de sierra circular (varios diámetros)", requerido: true },
    { nombre: "Aspirador de polvo (integrado o externo)", requerido: true },
    { nombre: "Protector de dedos", requerido: true },
    { nombre: "Guantes anticorte", requerido: true },
  ],
  "aspirador de polvo de yeso": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Bolsa filtrante HEPA", requerido: true },
    { nombre: "Manguera de succión", requerido: true },
    { nombre: "Boquilla de aspiración", requerido: true },
  ],
  "sutura mecánica": [
    { nombre: "Cartucho de grapas de recarga", requerido: true },
    { nombre: "Funda estéril protectora", requerido: true },
    { nombre: "Solución de limpieza del instrumento", requerido: false },
  ],
  "gabinete de narcóticos": [
    { nombre: "Llave de seguridad (2 copias)", requerido: true },
    { nombre: "Libro de registro de control", requerido: true },
    { nombre: "Candado de doble llave", requerido: true },
    { nombre: "Organizadores interiores", requerido: false },
  ],
  "detector de irradiación": [
    { nombre: "Pilas / baterías", requerido: true },
    { nombre: "Sonda de detección (Geiger-Müller)", requerido: true },
    { nombre: "Estuche de transporte", requerido: false },
    { nombre: "Certificado de calibración vigente", requerido: true },
  ],
  "ducha de descontaminación": [
    { nombre: "Manguera de alimentación de agua", requerido: true },
    { nombre: "Jabón descontaminante", requerido: true },
    { nombre: "Toallas absorbentes", requerido: true },
    { nombre: "Bolsas de residuos especiales", requerido: true },
    { nombre: "EPP de uso en zona de descontaminación", requerido: true },
  ],
  "computadora de escritorio": [
    { nombre: "Monitor", requerido: true },
    { nombre: "Teclado", requerido: true },
    { nombre: "Mouse", requerido: true },
    { nombre: "Cable de alimentación (CPU y monitor)", requerido: true },
    { nombre: "Cable de red Ethernet / Wi-Fi", requerido: true },
    { nombre: "UPS regulador de voltaje", requerido: true },
    { nombre: "Cable HDMI / VGA (conexión monitor)", requerido: true },
  ],
  "impresora de pulseras": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Cable USB / red Ethernet", requerido: true },
    { nombre: "Rollos de pulseras (color blanco adulto)", requerido: true },
    { nombre: "Rollos de pulseras (color pediátrico)", requerido: false },
    { nombre: "Rollos de pulseras de alerta (rojo/amarillo)", requerido: false },
    { nombre: "Cabezal de impresión de repuesto", requerido: false },
  ],
  "impresora láser": [
    { nombre: "Cable de alimentación", requerido: true },
    { nombre: "Cable USB / red Ethernet", requerido: true },
    { nombre: "Cartucho de tóner", requerido: true },
    { nombre: "Resma de papel (500 hojas)", requerido: true },
    { nombre: "Unidad de imagen / tambor (si aplica)", requerido: false },
  ],
  "lector de código qr/barras": [
    { nombre: "Cable USB / base de carga inalámbrica", requerido: true },
    { nombre: "Batería recargable (si inalámbrico)", requerido: false },
    { nombre: "Soporte de escritorio", requerido: false },
    { nombre: "Cable serial RS-232 (si aplica)", requerido: false },
  ],
  "sistema de intercomunicación": [
    { nombre: "Central / consola principal", requerido: true },
    { nombre: "Unidades de habitación / cuarto (extensiones)", requerido: true },
    { nombre: "Cable de alimentación central", requerido: true },
    { nombre: "Auricular / micrófono de repuesto", requerido: false },
    { nombre: "Fuente de poder UPS", requerido: true },
  ],
};

// Normalize key (remove accents, lowercase)
const norm = s => s.toLowerCase().trim()
  .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ú/g,"u")
  .replace(/ü/g,"u").replace(/ñ/g,"n");

// Build normalized lookup map
const LOOKUP = Object.fromEntries(Object.entries(ACCESORIOS).map(([k, v]) => [norm(k), v]));

async function main() {
  const equipos = await prisma.equipoMedico.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  let totalCreados = 0;
  let sinCobertura = [];

  for (const equipo of equipos) {
    // Check already has accessories
    const existing = await prisma.accesorioEquipo.count({ where: { equipoId: equipo.id } });
    if (existing > 0) continue;

    const key = norm(equipo.nombre);
    let accesorios = LOOKUP[key];

    // Fuzzy match: try to find key that is contained in equipo name or vice versa
    if (!accesorios) {
      const matchKey = Object.keys(LOOKUP).find(k =>
        key.includes(k) || k.includes(key)
      );
      if (matchKey) accesorios = LOOKUP[matchKey];
    }

    if (!accesorios) {
      sinCobertura.push(equipo.nombre);
      continue;
    }

    for (let i = 0; i < accesorios.length; i++) {
      await prisma.accesorioEquipo.create({
        data: {
          equipoId: equipo.id,
          nombre: accesorios[i].nombre,
          requerido: accesorios[i].requerido,
          orden: i,
        },
      });
    }
    totalCreados += accesorios.length;
    console.log(`✓ ${equipo.nombre}: ${accesorios.length} accesorios`);
  }

  console.log(`\n✅ Total accesorios creados: ${totalCreados}`);
  if (sinCobertura.length > 0) {
    console.log(`\n⚠ Sin cobertura (${sinCobertura.length}):`);
    sinCobertura.forEach(n => console.log(`  - ${n}`));
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
