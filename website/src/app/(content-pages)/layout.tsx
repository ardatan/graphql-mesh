import { HiveInnerLayout } from '../../components/hive-layout/hive-inner-layout';
import '@theguild/components/style.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <HiveInnerLayout isLanding={false}>{children}</HiveInnerLayout>;
}
