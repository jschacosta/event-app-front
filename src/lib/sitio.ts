// Web de Bora (políticas, soporte y borrado de cuenta) y correo de contacto.
// La dirección cambia en un solo lugar cuando esté el dominio definitivo.
export const SITIO = 'https://bora-oficial.vercel.app';
export const CONTACTO = 'jschacosta@gmail.com';

// El sitio está en español, inglés y portugués: ?lang= abre la página en el idioma de la app.
export const paginaSitio = (ruta: 'privacidad' | 'terminos' | 'normas' | 'soporte' | 'eliminar-cuenta', idioma: string) =>
  `${SITIO}/${ruta}?lang=${idioma}`;
