import type {Metadata} from "next";

export const metadata:Metadata={
  title:"سامانه کارکنان",
  description:"ورود امن کارکنان دبیرستان دخترانه مدرسه نمونه",
  robots:{index:false,follow:false,noarchive:true,nocache:true},
};

export default function PortalLayout({children}:{children:React.ReactNode}){
  return children;
}
