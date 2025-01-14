import { useEffect, useLayoutEffect } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function LandingPageContainer(props: React.HTMLAttributes<HTMLDivElement>) {
  useIsomorphicLayoutEffect(() => {
    // We add .light class to body to style the Headless UI
    // portal containing search results.
    document.body.classList.add('light');

    return () => {
      document.body.classList.remove('light');
    };
  }, []);

  return (
    <>
      <style global jsx>
        {`
          html {
            scroll-behavior: smooth;
            color-scheme: light !important;
          }
          body {
            background: #fff;
            --nextra-primary-hue: 191deg;
            --nextra-primary-saturation: 40%;
            --nextra-bg: 255, 255, 255;
          }
          .nextra-sidebar-footer {
            display: none;
          }
          #crisp-chatbox {
            z-index: 40 !important;
          }
        `}
      </style>
      <div className="flex h-full flex-col text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
        {props.children}
      </div>
    </>
  );
}
