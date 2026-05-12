// =============================================================================
// Button.js
// Boton estandar para toda la aplicacion. Mantiene consistencia visual.
//
// Variantes:
//   primary    - accion principal solida (azul)
//   secondary  - accion alterna outline azul (ej. usar data, editar)
//   danger     - accion destructiva outline rojo (ej. eliminar)
//   ghost      - accion neutra outline gris (ej. cancelar, limpiar)
//
// Tamanos:
//   sm  - botones de tabla, barras de accion (px-3 py-1.5 text-xs)
//   md  - botones de formularios principales (px-4 py-2 text-sm) [default]
//
// Soporta: disabled, type, onClick, fullWidth, title, children
// =============================================================================

const variantes = {
  primary:
    'border border-transparent bg-blue-600 text-white shadow-sm ' +
    'hover:bg-blue-700 active:bg-blue-800 ' +
    'disabled:bg-blue-400',
  secondary:
    'btn-secondary border border-blue-200 bg-blue-50 text-blue-700 ' +
    'hover:bg-blue-100 active:bg-blue-200 ' +
    'disabled:opacity-40',
  danger:
    'btn-danger border border-red-200 bg-red-50 text-red-700 ' +
    'hover:bg-red-100 active:bg-red-200 ' +
    'disabled:opacity-40',
  ghost:
    'btn-ghost border border-slate-200 bg-white text-slate-700 ' +
    'hover:bg-slate-100 active:bg-slate-200 ' +
    'disabled:opacity-40',
}

const tamanos = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  disabled = false,
  onClick,
  title,
  children,
  className = '',
}) {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium ' +
    'transition-all duration-150 ease-out ' +
    'active:scale-[0.97] disabled:active:scale-100 ' +
    'disabled:cursor-not-allowed'
  const v = variantes[variant] || variantes.primary
  const t = tamanos[size] || tamanos.md
  const w = fullWidth ? 'w-full' : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${v} ${t} ${w} ${className}`.trim()}
    >
      {children}
    </button>
  )
}
