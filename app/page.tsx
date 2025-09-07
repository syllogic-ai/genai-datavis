"use client";

import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { Button } from "@/components/ui/button";
import { ContainerTextFlip } from "@/components/ui/container-text-flip";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative dark dark:text-primary bg-black flex min-h-screen w-full flex-col justify-center overflow-hidden">
      <BackgroundRippleEffect />
      
      <div className="w-full h-full  dark:text-primary px-18 mx-auto flex flex-row justify-between">
      
        <div className="flex flex-col gap-4">
          <h2 className="relative z-10 dark:text-primary/60 max-w-4xl text-left font-semibold text-xl md:teSighxt-3xl lg:text-5xl ">
            Dashboards, Analytics, Reporting & your own Data Assistant made for{" "}
            <ContainerTextFlip
              words={["Founders", "Analysts", "Consultants", "Startups"]}
            />
          </h2>
          <div className="flex flex-row gap-4">
            <Button
              variant="secondary"
              className="relative bg-secondary/60 w-fit px-6 font-mono py-8 text-lg z-10 mt-4"
            >
              Talk to a Founder
            </Button>
            <Button className="relative w-fit px-6 font-mono py-8 text-lg z-10 mt-4">
              Request Access
            </Button>
          </div>
        </div>
    
      </div>
    </div>
  );
}
