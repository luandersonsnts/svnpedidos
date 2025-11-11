import React, { forwardRef } from 'react'
import { Link } from 'react-router-dom'

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'lg' | 'sm' | 'xs'
  block?: boolean
  to?: string
  href?: string
  target?: React.HTMLAttributeAnchorTarget
  rel?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  ariaLabel?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(({ 
  variant = 'primary',
  size,
  block,
  to,
  href,
  target,
  rel,
  type = 'button',
  disabled,
  className = '',
  ariaLabel,
  onClick,
  children,
}, ref) => {
  const classes = [
    'btn',
    variant === 'secondary' ? 'secondary' : '',
    variant === 'outline' ? 'outline' : '',
    size === 'lg' ? 'btn-lg' : '',
    size === 'sm' ? 'btn-sm' : '',
    size === 'xs' ? 'btn-xs' : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel} onClick={onClick as any} ref={ref as any}>
        {children}
      </Link>
    )
  }
  if (href) {
    const isExternal = /^https?:\/\//i.test(href)
    const computedRel = rel ?? (target === '_blank' || isExternal ? 'noopener noreferrer' : undefined)
    return (
      <a href={href} className={classes} aria-label={ariaLabel} onClick={onClick as any} target={target} rel={computedRel} ref={ref as any}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled} aria-label={ariaLabel} onClick={onClick as any} ref={ref as any}>
      {children}
    </button>
  )
})

export default Button