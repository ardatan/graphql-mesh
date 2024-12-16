'use client';

import { useState } from 'react';
import { CallToAction, CheckIcon } from '@theguild/components';

// TODO: We'll add more package managers later.
export function InstallButton() {
  const text = 'npm i graphql-mesh';

  const [copied, setCopied] = useState(false);

  return (
    <CallToAction
      variant="secondary-inverted"
      className="font-mono font-medium"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {text}
      {copied ? <CheckIcon className="size-6" /> : <CopyIcon className="size-6" />}
    </CallToAction>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="24" viewBox="0 0 25 24" {...props}>
      <path
        d="M7.9999 6.6V3.9C7.9999 3.66131 8.09472 3.43239 8.26351 3.2636C8.43229 3.09482 8.66121 3 8.8999 3H19.6999C19.9386 3 20.1675 3.09482 20.3363 3.2636C20.5051 3.43239 20.5999 3.66131 20.5999 3.9V16.5C20.5999 16.7387 20.5051 16.9676 20.3363 17.1364C20.1675 17.3052 19.9386 17.4 19.6999 17.4H16.9999V20.1C16.9999 20.5968 16.5949 21 16.0936 21H5.3062C5.18752 21.0007 5.06986 20.978 4.95999 20.9331C4.85012 20.8882 4.75021 20.822 4.666 20.7384C4.58178 20.6547 4.51492 20.5553 4.46925 20.4457C4.42359 20.3362 4.40002 20.2187 4.3999 20.1L4.4026 7.5C4.4026 7.0032 4.8076 6.6 5.3089 6.6H7.9999ZM6.2026 8.4L6.1999 19.2H15.1999V8.4H6.2026ZM9.7999 6.6H16.9999V15.6H18.7999V4.8H9.7999V6.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
