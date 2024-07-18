import React, { useRef } from "react";

import { useState } from "react";

const InPageNavigation = ({ routes }) => {
  let [inPageNavIndex, setInpageNavIndex] = useState(0);
  let activeTabLineRef = useRef();
  const changePageState = (btn, i) => {
    let { offsetWidth, offsetLeft } = btn;
  };
  return (
    <>
      <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-auto">
        {routes.map((route, i) => {
          return (
            <button
              key={i}
              className={
                "p-4 px-5 capitalize " +
                (inPageNavIndex == i ? "text-black" : "text-dark-grey")
              }
              onClick={(e) => {
                changePageState(e.target, i);
              }}
            >
              {route}
            </button>
          );
        })}
        <hr ref={activeTabLineRef} className="absolute bottom-0 duration-300" />
      </div>
    </>
  );
};

export default InPageNavigation;
