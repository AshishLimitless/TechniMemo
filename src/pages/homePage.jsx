import React from "react";
import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpageNavigation";

const HomePage = () => {
  return (
    <AnimationWrapper>
      <section className="h-cover flex justify-center gap-10 ">
        {/* div for lastest blogs */}
        <div className="w-full">
          <InPageNavigation
            routes={["home", "trending blogs"]}
          ></InPageNavigation>
        </div>
        {/* This is div for filters and trending blogs */}
        <div></div>
      </section>
    </AnimationWrapper>
  );
};

export default HomePage;
