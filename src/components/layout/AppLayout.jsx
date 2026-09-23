import { UZBEK_TERMS } from "../../constants/prayers";
import SideNav from "./SideNav";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f1eee6]">
      {" "}
      <SideNav /> {/* Main content */}{" "}
      <div className="min-h-screen lg:pl-64 flex flex-col">
        {" "}
        <main className="flex-1 min-w-0">
          {" "}
          <div className=" w-full  lg:w-full mx-auto px-0 lg:px-8 pb-24 lg:pb-10 ">
            {" "}
            {children}{" "}
          </div>{" "}
        </main>{" "}
        {/* Desktop footer */}{" "}
        <footer className="hidden lg:block text-center text-green-300/60 text-xs py-4">
          {" "}
          {UZBEK_TERMS.appName}
        </footer>{" "}
      </div>{" "}
    </div>
  );
}
