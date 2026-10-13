const STEPS = [
  { title: 'Elige', text: 'Arma tu lista con cantidades por talla.' },
  { title: 'Cotiza', text: 'La envías por WhatsApp y te respondemos con precio de volumen.' },
  { title: 'Aprueba', text: 'Te mandamos una prueba digital con tallas, nombres y números.' },
  { title: 'Recibe', text: 'Entregamos en la fecha que acordamos.' },
];

/** HowItWorks (UI/UX §7.7): 01 Elige → 02 Cotiza → 03 Aprueba → 04 Recibe. */
export function HowItWorks() {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:gap-x-8 lg:gap-y-7">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3.5 lg:flex-col lg:gap-1.5">
          <span aria-hidden="true" className="type-number text-rojo w-10 shrink-0">
            0{index + 1}
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="type-h4">
              <span className="sr-only">Paso {index + 1}: </span>
              {step.title}
            </h3>
            <p className="type-small text-grafito">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
