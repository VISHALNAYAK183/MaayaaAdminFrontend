import { useState } from "react";

const ChartTab: React.FC = () => {
  const [selected, setSelected] = useState<
    "optionOne" | "optionTwo" | "optionThree"
  >("optionOne");

  const getButtonClass = (option: "optionOne" | "optionTwo" | "optionThree") =>
    selected === option
      ? "shadow-theme-xs text-gray-900 bg-white"
      : "text-gray-500";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
      <button
        onClick={() => setSelected("optionOne")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 ${getButtonClass(
          "optionOne"
        )}`}
      >
        Monthly
      </button>

      <button
        onClick={() => setSelected("optionTwo")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 ${getButtonClass(
          "optionTwo"
        )}`}
      >
        Quarterly
      </button>

      <button
        onClick={() => setSelected("optionThree")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 ${getButtonClass(
          "optionThree"
        )}`}
      >
        Annually
      </button>
    </div>
  );
};

export default ChartTab;
