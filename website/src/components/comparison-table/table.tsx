import { cn } from '@theguild/components';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  layout?: 'fixed' | 'auto';
}
export function Table({ children, className, layout = 'auto', ...rest }: TableProps) {
  return (
    <div className={cn('border border-green-200 rounded-3xl overflow-hidden', className)}>
      <table className={cn('w-full', layout === 'fixed' && 'table-fixed')} {...rest}>
        {children}
      </table>
    </div>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  highlight?: boolean;
}
export function TableRow({ highlight, className, ...rest }: TableRowProps) {
  return (
    <tr
      className={cn(
        'bg-white [&:first-child>*]:border-t-0 [&:last-child>*]:border-b-0',
        highlight && 'bg-green-100',
        className,
      )}
      {...rest}
    >
      {rest.children}
    </tr>
  );
}

const cellStyle =
  'p-4 border-green-200 border [&:first-child]:border-l-0 [&:last-child]:border-r-0';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableCellElement> {}
export function TableHeader({ children, className, ...rest }: TableHeaderProps) {
  return (
    <th className={cn(cellStyle, 'font-medium text-base', className)} {...rest}>
      {children}
    </th>
  );
}

export interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {}
export function TableCell({ children, className, ...rest }: TableCellProps) {
  return (
    <td className={cn(cellStyle, className)} {...rest}>
      {children}
    </td>
  );
}
