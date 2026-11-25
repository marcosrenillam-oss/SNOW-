// Textos fáciles de editar. Aquí irán tus consejos y trucos.

export const TRICKS = {
  ollie: {
    name: 'Ollie',
    level: 'BÁSICO',
    desc: 'Saltar usando la cola de la tabla como si fuera un muelle. Es la base de casi todos los trucos.',
    steps: [
      'Flexiona y carga el peso en el pie de atrás.',
      'Levanta el pie delantero: el nose sube y el tail se dobla.',
      'Salta tirando del pie trasero hacia arriba: ¡muelle!',
      'Recoge las rodillas en el aire y aterriza flexionando.',
    ],
  },
  nollie: {
    name: 'Nollie',
    level: 'BÁSICO+',
    desc: 'El ollie al revés: el muelle es el nose. Cuesta un poco más porque el pie delantero tiene que hacer la fuerza.',
    steps: [
      'Carga el peso en el pie delantero.',
      'Levanta el pie de atrás: el tail sube.',
      'Salta desde el nose.',
      'Nivela la tabla en el aire y aterriza con las dos a la vez.',
    ],
  },
  press: {
    name: 'Nose press',
    level: 'BÁSICO',
    desc: 'Cargas el peso encima del nose hasta que la cola se levanta, y aguantas el equilibrio deslizando.',
    steps: [
      'Ve despacio, en una zona plana.',
      'Lleva la cadera hacia el pie delantero.',
      'Flexiona la pierna de delante y estira la de atrás.',
      'Aguanta… y vuelve al centro.',
    ],
  },
  shifty: {
    name: 'Shifty',
    level: 'INTERMEDIO',
    desc: 'En el aire giras la tabla con las piernas, sin mover los hombros, y la vuelves a poner recta antes de caer.',
    steps: [
      'Haz un ollie con buena altura.',
      'Hombros quietos, mirando al frente.',
      'Gira la tabla con las piernas unos 45–90°.',
      'Devuélvela recta y aterriza.',
    ],
  },
  spin: {
    name: '180',
    level: 'INTERMEDIO',
    desc: 'Media vuelta en el aire. Aterrizas con el otro pie delante (en switch).',
    steps: [
      'Pre-gira los hombros hacia el lado contrario.',
      'Haz un ollie y suelta la rotación: hombros, cadera y tabla.',
      'Mira por encima del hombro hacia donde aterrizas.',
      'Aterriza flexionando con el peso centrado.',
    ],
  },
};

export const TIPS = [
  { e: '👀', t: 'Mira a donde vas', d: 'La tabla va donde va tu mirada. Si miras a tus pies, te vas al suelo.' },
  { e: '🦵', t: 'Rodillas blandas', d: 'Son tus amortiguadores. Si vas rígido, cualquier bache te tira.' },
  { e: '🎯', t: 'El pie delantero manda', d: 'Es tu volante. Si echas el peso atrás, la tabla se te escapa.' },
  { e: '🦶', t: 'Pedales, no fuerza', d: 'Para ir de lado a lado no empujes: aprieta suave el pie del lado al que quieres ir.' },
  { e: '🤲', t: 'Cómo caerse', d: 'Hacia delante: sobre los antebrazos, puños cerrados. Hacia atrás: culo y barbilla al pecho. Nunca las muñecas.' },
  { e: '🧘', t: 'Brazos tranquilos', d: 'Nada de molinillos. Relajados y por encima de la tabla.' },
  { e: '🟢', t: 'Empieza en verde', d: 'Pistas suaves y anchas. La confianza llega antes que la velocidad.' },
  { e: '✍️', t: 'Próximamente…', d: 'Aquí irán los consejos que me enseñaron a mí cuando empecé.', todo: true },
];
