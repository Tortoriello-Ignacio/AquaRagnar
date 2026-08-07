/* ============================================================
   AquaRagnar · datos del sitio
   Única fuente de verdad de todo lo que se repite en la portada.
   Para cambiar un texto, una foto o un precio: se toca acá y nada más.
   ============================================================ */
(function (raiz) {
  "use strict";

  /* Menú fluido: cada ítem pinta su propia marquesina.
     La foto de fondo sale de .menu--<clave> .marquesina__img (estilos.css). */
  var MENU = [
    { clave: "programas", texto: "Programas", destino: "#programas" },
    { clave: "horarios",  texto: "Horarios",  destino: "#panel-horarios" },
    { clave: "tienda",    texto: "Tienda",    destino: "#tienda"    },
    { clave: "contacto",  texto: "Contacto",  destino: "#sumate"    }
  ];

  /* Programas: galeria.js lee estos datos del DOM (#origenProgramas). */
  var PROGRAMAS = [
    {
      texto: "Escuela",
      grupo: "Escuela",
      detalle: "5 a 12 años · Mar y Jue · 17:00",
      descripcion: "Flotar, respirar y cruzar la pileta con confianza y seguridad.",
      foto: "assets/images/galeria-escuela.webp",
      alt: "Chicos de la Escuela de AquaRagnar con gorros y antiparras, sonriendo al borde de la pileta."
    },
    {
      texto: "Entrenamiento",
      grupo: "Entrenamiento",
      detalle: "Adultos · Lun, Mié y Vie · 07:00 y 20:00",
      descripcion: "Desarrollo técnico y volumen progresivo: objetivos de 2.000 a 5.000 metros adaptados al límite y ritmo de cada nadador.",
      foto: "assets/images/galeria-entrenamiento.webp",
      alt: "Grupo de adultos de AquaRagnar dentro de la pileta sosteniendo la bandera del club."
    },
    {
      texto: "Competencia",
      grupo: "Competencia",
      detalle: "13 a 18 años · Lun a Sáb · 06:30 y 19:00",
      descripcion: "Series cronometradas, perfeccionamiento de salidas y virajes, y preparación para el calendario federado.",
      foto: "assets/images/galeria-competencia.webp",
      alt: "Nadadora en posición de largada sobre el banco de partida durante una competencia."
    },
    {
      texto: "Aguas abiertas",
      grupo: "Aguas abiertas",
      detalle: "Todos los niveles · Sáb · 09:00",
      descripcion: "Táctica de navegación, orientación y adaptación al agua fría en río, lago y mar.",
      foto: "assets/images/galeria-aguas.webp",
      alt: "El grupo de aguas abiertas de AquaRagnar festejando en la orilla de un lago con sus boyas de arrastre."
    }
  ];

  /* Vitrina de la portada: cuatro destacados, uno por categoría.
     Las fotos se sirven del CDN de Tiendanube (se actualizan solas).
     Si cambia un precio, hay que cambiarlo también en tienda.html. */
  var DESTACADOS = [
    {
      categoria: "Accesorios",
      nombre: "Antiparras Dak Viper Mirror",
      precio: "$60.000",
      foto: "img_2568-181387379dee5da9b517830192485890-640-0.webp"
    },
    {
      categoria: "Indumentaria",
      nombre: "Buzo Guardavidas Dak",
      precio: "$52.000",
      foto: "img_2600-f92bb4f7afa6ef692217830195178834-640-0.webp"
    },
    {
      categoria: "Entrenamiento",
      nombre: "Manoplas Dak Hawái",
      precio: "$18.000",
      foto: "img_2563-da01e5534b7905858b17830034100078-640-0.webp"
    },
    {
      categoria: "Suplementos",
      nombre: "Creatina Star Nutrition 300g",
      precio: "$31.000",
      foto: "img_0217-5ee3b21c851f22b92017819899943818-640-0.webp"
    }
  ];

  var CDN_TIENDA = "https://dcdn-us.mitiendanube.com/stores/007/851/753/products/";

  /* Mosaico del equipo. forma: "grande" = 2x2, "alta" = 1x2, vacío = 1x1.
     El orden importa: las apaisadas van en los cuadrantes anchos. */
  var EQUIPO = [
    { foto: "assets/images/equipo-08.webp", ancho: 852, alto: 516, forma: "grande",
      titulo: "El grupo",
      texto: "Los que llegan, se meten y cumplen el plan del día.",
      alt: "Nadadores del club al borde de la pileta después del entrenamiento" },
    { foto: "assets/images/equipo-01.webp", ancho: 529, alto: 586, forma: "",
      titulo: "La bandera del clan",
      texto: "El emblema viaja a donde vayamos a nadar.",
      alt: "Grupo del club sosteniendo la bandera de AquaRagnar en la pileta" },
    { foto: "assets/images/equipo-03.webp", ancho: 536, alto: 735, forma: "alta",
      titulo: "Después de la serie",
      texto: "Lo que queda cuando se apaga el cronómetro.",
      alt: "Dos nadadores del club posando al borde de la pileta" },
    { foto: "assets/images/equipo-04.webp", ancho: 670, alto: 761, forma: "alta",
      titulo: "Competencia",
      texto: "Largada, andarivel y el equipo alentando desde el borde.",
      alt: "Nadadores festejando en el borde de una pileta de competencia" },
    { foto: "assets/images/equipo-10.webp", ancho: 673, alto: 815, forma: "alta",
      titulo: "Los colores del club",
      texto: "La remera se gana entrenando.",
      alt: "Dos integrantes del club con la remera de AquaRagnar junto a la pileta" },
    { foto: "assets/images/equipo-06.webp", ancho: 514, alto: 570, forma: "alta",
      titulo: "Antes de largar",
      texto: "En aguas abiertas el nervio previo también se entrena.",
      alt: "Tres nadadores en la orilla antes de una prueba de aguas abiertas" },
    { foto: "assets/images/equipo-02.webp", ancho: 668, alto: 469, forma: "",
      titulo: "Aguas abiertas",
      texto: "Del andarivel al río: la misma cabeza, otro escenario.",
      alt: "Grupo con la bandera del club en la orilla de una laguna" },
    { foto: "assets/images/equipo-12.webp", ancho: 610, alto: 764, forma: "alta",
      titulo: "Atardecer",
      texto: "Se termina el día y la bandera sigue arriba.",
      alt: "Dos nadadores con la bandera del club frente al río al atardecer" },
    { foto: "assets/images/equipo-07.webp", ancho: 502, alto: 643, forma: "alta",
      titulo: "La rutina",
      texto: "Llegar, meterse y hacer el trabajo del día.",
      alt: "Nadador caminando por el borde de la pileta antes de entrar al agua" },
    { foto: "assets/images/equipo-09.webp", ancho: 516, alto: 447, forma: "",
      titulo: "Podio",
      texto: "Lo que se entrena a las seis y media de la mañana se ve acá.",
      alt: "Podio de una carrera de aguas abiertas con tres competidores" },
    { foto: "assets/images/equipo-05.webp", ancho: 536, alto: 327, forma: "",
      titulo: "Todos al agua",
      texto: "Escuela, competencia y máster comparten pileta.",
      alt: "Grupo grande de nadadores dentro de la pileta con la bandera del club" },
    { foto: "assets/images/equipo-11.webp", ancho: 516, alto: 347, forma: "",
      titulo: "Salida del agua",
      texto: "El último tramo se corre; el cuerpo ya lo sabe.",
      alt: "Nadador saliendo del agua al final de una carrera en aguas abiertas" }
  ];

  raiz.AR = {
    MENU: MENU,
    PROGRAMAS: PROGRAMAS,
    DESTACADOS: DESTACADOS,
    CDN_TIENDA: CDN_TIENDA,
    EQUIPO: EQUIPO,
    /* cuántas veces se repite el texto dentro de cada marquesina */
    REPETICIONES_MARQUESINA: 12
  };
})(window);
