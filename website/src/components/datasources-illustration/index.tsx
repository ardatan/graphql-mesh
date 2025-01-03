import { ReactNode } from 'react';
import { cn, Heading, PRODUCTS, Stud } from '@theguild/components';

export function DatasourcesIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex text-white bg-green-1000 gap-8 xl:gap-[72px] py-6 px-4 lg:p-8 lg:py-16 xl:p-[72px] rounded-3xl',
        className,
      )}
    >
      <div className="[@media(width>=760px)]:w-[400px]">
        <Heading as="h3" size="md">
          Connect datasources
        </Heading>
        <p className="mt-4 text-white-800">
          Transform non-GraphQL services into GraphQL-ready interfaces with Mesh, enhancing API
          consistency.
        </p>
        <ul className="flex flex-col gap-6 lg:gap-8 mt-10 lg:mt-12">
          {[
            {
              icon: <TiltMeterIcon />,
              text: 'Automate the creation of type-safe GraphQL APIs from any data source, ensuring reliability and developer efficiency.',
            },
            {
              icon: <PaperclipIcon />,
              text: 'Enhance data sources by integrating additional data with full type safety, using Mesh.',
            },
            {
              icon: <ScanLine />,
              text: 'Extend the capabilities of your schema with Mesh by mocking, caching, and transforming data seamlessly.',
            },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-4">
              <Stud>{icon}</Stud>
              <p className="text-white-800">{text}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 flex justify-center [@media(width<760px)]:hidden">
        <Illustration className="max-w-[600px]" />
      </div>
    </div>
  );
}

function Illustration({ className }: { className?: string }) {
  return (
    <article
      className={cn('grid grid-cols-8 [grid-template-rows:repeat(5,auto)] h-[508px]', className)}
    >
      <SmallNode className="self-end col-span-2">Mobile App</SmallNode>
      <SmallNode className="self-end col-span-2 col-start-4">Web App</SmallNode>
      <SmallNode className="self-end col-span-2 col-start-7">Node.js Client</SmallNode>
      <Diagonal variant="left" className="col-start-2 row-start-2 col-span-2" />
      <Diagonal variant="middle" className="col-start-5 row-start-2" />
      <Diagonal variant="right" className="-col-end-2 row-start-2 col-span-2 justify-self-end" />
      <div className="col-start-3 col-span-4 row-start-3 flex justify-center">
        <div className="relative z-10 items-center justify-center gap-4 rounded-2xl p-4 xl:gap-4 xl:py-[22px] bg-gradient-to-br from-[#4F6C6A] to-[#004540] transition-colors duration-500 lg:px-12 xl:px-16 py-6 backdrop-blur-sm flex flex-col text-center">
          <PRODUCTS.MESH.logo className="size-16 lg:size-20 [&>g]:fill-[url(#logo-gradient)] shrink-0" />
          <div className="font-medium text-white">GraphQL Mesh</div>
        </div>
        <svg className="absolute">
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="6.87%" stopColor="#A2C1C4" />
              <stop offset="86.25%" stopColor="#689093" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <Diagonal variant="right" className="col-start-2 -row-end-2 col-span-2" />
      <Diagonal variant="middle" className="col-start-5 -row-end-2" />
      <Diagonal variant="left" className="col-start-6 -row-end-2 col-span-2 justify-self-end" />
      <SmallNode className="col-span-2 col-start-0 -row-end-1 self-start">Books Rest API</SmallNode>
      <SmallNode className="col-span-2 col-start-4 -row-end-1 self-start">
        Authors gRPC API
      </SmallNode>
      <SmallNode className="col-span-2 col-start-7 -row-end-1 self-start">
        Stores GraphQL API
      </SmallNode>
    </article>
  );
}

function SmallNode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div className="px-3 py-2 xl:px-6 xl:py-3 bg-[#004540] text-[#A2C1C4] backdrop-blur-sm rounded-lg text-sm lg:text-nowrap justify-center flex items-center text-center">
        {children}
      </div>
    </div>
  );
}

function Diagonal({
  variant,
  className,
}: {
  variant: 'left' | 'middle' | 'right';
  className?: string;
}) {
  if (variant === 'middle') {
    return <div className={cn('bg-[#4F6C6A] w-px -translate-x-1/2', className)} />;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 155 125"
      fill="none"
      preserveAspectRatio="none"
      className={cn(
        variant === 'right' && '[transform:rotateY(180deg)]',
        'self-stretch w-auto',
        className,
      )}
    >
      <path
        d="M1 0.0498047V54.141C1 58.5397 4.55124 62.1133 8.94987 62.1409L146.05 63C150.449 63.0276 154 66.6011 154 70.9998V124.05"
        stroke="#4F6C6A"
      />
    </svg>
  );
}

function TiltMeterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
      <path
        d="M3.04485 12.9498H4.85565C5.07527 14.6896 5.92222 16.2895 7.23756 17.4492C8.55291 18.6089 10.2462 19.2488 11.9998 19.2488C13.7534 19.2488 15.4468 18.6089 16.7621 17.4492C18.0775 16.2895 18.9244 14.6896 19.144 12.9498H20.9557C20.5039 17.4975 16.6663 21.0498 11.9998 21.0498C7.33335 21.0498 3.49575 17.4975 3.04485 12.9498ZM3.04485 11.1498C3.49485 6.6021 7.33245 3.0498 11.9998 3.0498C16.6672 3.0498 20.5039 6.6021 20.9548 11.1498H19.144C18.9244 9.41001 18.0775 7.81015 16.7621 6.65041C15.4468 5.49068 13.7534 4.85077 11.9998 4.85077C10.2462 4.85077 8.55291 5.49068 7.23756 6.65041C5.92222 7.81015 5.07527 9.41001 4.85565 11.1498H3.04395H3.04485ZM11.9998 13.8498C11.5225 13.8498 11.0646 13.6602 10.7271 13.3226C10.3895 12.985 10.1998 12.5272 10.1998 12.0498C10.1998 11.5724 10.3895 11.1146 10.7271 10.777C11.0646 10.4394 11.5225 10.2498 11.9998 10.2498C12.4772 10.2498 12.9351 10.4394 13.2726 10.777C13.6102 11.1146 13.7998 11.5724 13.7998 12.0498C13.7998 12.5272 13.6102 12.985 13.2726 13.3226C12.9351 13.6602 12.4772 13.8498 11.9998 13.8498Z"
        fill="white"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
      <path
        d="M17.7278 15.2321L16.4552 13.9577L17.7278 12.6851C18.1487 12.2679 18.483 11.7717 18.7116 11.225C18.9402 10.6782 19.0585 10.0917 19.0598 9.49911C19.0611 8.90651 18.9453 8.31948 18.7192 7.77174C18.493 7.22399 18.1608 6.72632 17.7418 6.30728C17.3228 5.88824 16.8251 5.5561 16.2773 5.32992C15.7296 5.10374 15.1426 4.98797 14.55 4.98927C13.9574 4.99057 13.3708 5.1089 12.8241 5.33748C12.2773 5.56606 11.7811 5.90038 11.3639 6.32125L10.0913 7.59475L8.81783 6.32215L10.0922 5.04955C11.2738 3.86801 12.8763 3.20422 14.5472 3.20422C16.2182 3.20422 17.8207 3.86801 19.0022 5.04955C20.1838 6.23108 20.8476 7.8336 20.8476 9.50454C20.8476 11.1755 20.1838 12.778 19.0022 13.9595L17.7287 15.2321H17.7278ZM15.1826 17.7773L13.9091 19.0499C12.7276 20.2315 11.1251 20.8953 9.45413 20.8953C7.78318 20.8953 6.18067 20.2315 4.99913 19.0499C3.81759 17.8684 3.15381 16.2659 3.15381 14.5949C3.15381 12.924 3.81759 11.3215 4.99913 10.1399L6.27263 8.86734L7.54523 10.1417L6.27263 11.4143C5.85176 11.8315 5.51744 12.3278 5.28887 12.8745C5.06029 13.4213 4.94195 14.0078 4.94066 14.6004C4.93936 15.193 5.05512 15.78 5.2813 16.3278C5.50748 16.8755 5.83963 17.3732 6.25866 17.7922C6.6777 18.2112 7.17538 18.5434 7.72312 18.7696C8.27087 18.9958 8.85789 19.1115 9.4505 19.1102C10.0431 19.1089 10.6296 18.9906 11.1764 18.762C11.7231 18.5334 12.2193 18.1991 12.6365 17.7782L13.9091 16.5056L15.1826 17.7782V17.7773ZM14.5454 8.23104L15.8189 9.50454L9.45503 15.8675L8.18153 14.5949L14.5454 8.23195V8.23104Z"
        fill="white"
      />
    </svg>
  );
}

function ScanLine() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
      <path
        d="M5.92407 4.61656L13.3573 12.0498L11.9999 13.4073L8.69175 10.0991C8.26679 10.8196 8.08873 11.6592 8.18464 12.4902C8.28054 13.3212 8.64517 14.0981 9.22309 14.7029C9.801 15.3076 10.5606 15.7071 11.3864 15.8407C12.2121 15.9742 13.0589 15.8344 13.798 15.4426C14.537 15.0508 15.1279 14.4284 15.4808 13.6699C15.8338 12.9115 15.9294 12.0586 15.7531 11.2409C15.5769 10.4232 15.1385 9.68537 14.5045 9.13965C13.8705 8.59392 13.0757 8.27014 12.2409 8.21752L10.5081 6.48472C11.8177 6.13351 13.2093 6.2556 14.4378 6.82948C15.6664 7.40337 16.653 8.39227 17.2241 9.62207C17.7952 10.8519 17.9142 12.2437 17.56 13.5526C17.2059 14.8615 16.4013 16.0035 15.288 16.7775C14.1747 17.5515 12.824 17.9079 11.4737 17.7841C10.1234 17.6602 8.86014 17.0639 7.90626 16.1002C6.95238 15.1365 6.36906 13.8672 6.25899 12.5157C6.14893 11.1642 6.51917 9.81726 7.30455 8.71192L5.93271 7.34008C4.78789 8.81593 4.22016 10.6584 4.33578 12.5227C4.4514 14.3869 5.24244 16.1451 6.56084 17.4682C7.87924 18.7913 9.63463 19.5886 11.4985 19.7108C13.3623 19.833 15.2068 19.2718 16.6867 18.1323C18.1666 16.9927 19.1805 15.3529 19.5386 13.5197C19.8967 11.6865 19.5744 9.78568 18.6322 8.17295C17.6899 6.56022 16.1922 5.34614 14.4194 4.75797C12.6467 4.16981 10.7203 4.24786 9.00087 4.97752L7.55895 3.53656C8.92957 2.82042 10.4535 2.44751 11.9999 2.44984C17.302 2.44984 21.5999 6.74776 21.5999 12.0498C21.5999 17.3519 17.302 21.6498 11.9999 21.6498C6.69783 21.6498 2.39991 17.3519 2.39991 12.0498C2.39846 10.6269 2.71399 9.22147 3.32358 7.93571C3.93317 6.64994 4.82151 5.5161 5.92407 4.61656Z"
        fill="white"
      />
    </svg>
  );
}
