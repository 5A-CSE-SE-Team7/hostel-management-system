import React from 'react';

/**
 * Typographic Echo Stack Component
 * Layers 5 instances of text with precise -0.04em geometric offsets
 * and fading gray values for luxury-brutalist depth.
 */
export default function EchoText({
  text,
  as: Component = 'div',
  className = '',
  style = {},
  ...props
}) {
  const layers = [
    { offset: '-0.16em', color: 'var(--echo-layer-4, #d9d9d9)', zIndex: 1 },
    { offset: '-0.12em', color: 'var(--echo-layer-3, #d1d1d1)', zIndex: 2 },
    { offset: '-0.08em', color: 'var(--echo-layer-2, #c9c9c9)', zIndex: 3 },
    { offset: '-0.04em', color: 'var(--echo-layer-1, #bfbfbf)', zIndex: 4 },
  ];

  return (
    <Component className={`echo-stack ${className}`.trim()} style={style} {...props}>
      {layers.map((layer, index) => (
        <span
          key={index}
          className="echo-layer"
          aria-hidden="true"
          style={{
            transform: `translate(${layer.offset}, ${layer.offset})`,
            color: layer.color,
            zIndex: layer.zIndex,
          }}
        >
          {text}
        </span>
      ))}
      <span className="echo-foreground" style={{ zIndex: 5 }}>
        {text}
      </span>
    </Component>
  );
}
