"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const scenes = [
  {
    id: "story-start",
    image: "/media/landing-story/nano-scene-01-clean.webp",
    title: ["Ваш день.", "Ваша история."],
    label: "Начало истории",
  },
  {
    id: "story-invitation",
    image: "/media/landing-story/nano-scene-02.webp",
    title: ["Всё начинается", "с приглашения."],
    label: "Приглашение",
  },
  {
    id: "story-celebration",
    image: "/media/landing-story/nano-scene-03-clean.webp",
    title: ["Каждый момент", "останется с вами."],
    label: "Праздник",
  },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function StoryHero({ signedIn }: { signedIn: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const visualRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = rootRef.current;
      if (!root) return;

      const travel = Math.max(root.offsetHeight - window.innerHeight, 1);
      const progress = clamp((-root.getBoundingClientRect().top / travel) * 2, 0, 2);
      const nearest = Math.round(progress);

      if (nearest !== currentRef.current) {
        currentRef.current = nearest;
        setCurrent(nearest);
      }

      visualRefs.current.forEach((visual, index) => {
        if (!visual) return;
        const distance = Math.abs(progress - index);
        visual.style.opacity = String(clamp((0.5 - distance) / 0.12, 0, 1));
        visual.style.transform = "translate3d(" + ((index - progress) * 74) + "px, 0, 0) scale(1.035)";
      });

      copyRefs.current.forEach((copy, index) => {
        if (!copy) return;
        const distance = Math.abs(progress - index);
        const opacity = clamp((0.5 - distance) / 0.12, 0, 1);
        copy.style.opacity = String(opacity);
        copy.style.transform = "translate3d(0, " + ((index - progress) * 82) + "px, 0)";
        copy.style.pointerEvents = opacity > 0.55 ? "auto" : "none";
        copy.setAttribute("aria-hidden", opacity > 0.55 ? "false" : "true");
      });

      if (progressRef.current) {
        progressRef.current.style.width = (((progress + 1) / 3) * 100) + "%";
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} id="story-scenes" className="story-scroll" aria-label="История вашего дня">
      <div className="story-stage">
        <Image
          src="/media/landing-story/nano-continuous.webp"
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="story-stage-base"
        />
        <div className="story-stage-veil" aria-hidden="true" />
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            ref={(node) => { visualRefs.current[index] = node; }}
            className={"story-stage-visual story-stage-visual--" + (index + 1)}
            style={{ opacity: index === 0 ? 1 : 0 }}
            aria-hidden="true"
          >
            <Image src={scene.image} alt="" fill sizes="100vw" loading="eager" className="story-stage-image" />
          </div>
        ))}

        <div className="story-stage-inner">
          {scenes.map((scene, index) => {
            const Heading = index === 0 ? "h1" : "h2";
            return (
              <div
                key={scene.id}
                ref={(node) => { copyRefs.current[index] = node; }}
                className="story-stage-copy"
                style={{ opacity: index === 0 ? 1 : 0 }}
                aria-hidden={index === 0 ? undefined : true}
              >
                <span className="story-stage-kicker">{scene.label}</span>
                <Heading>{scene.title[0]}<br />{scene.title[1]}</Heading>
                <Link href={signedIn ? "/app" : "/register"} className="story-scene-action">
                  {signedIn ? "Перейти в кабинет" : "Создать свадьбу"}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            );
          })}

          <div className="story-stage-bottom">
            <span>{String(current + 1).padStart(2, "0")} / 03</span>
            <div className="story-stage-progress"><span ref={progressRef} /></div>
            <a href={current < 2 ? "#" + scenes[current + 1].id : "#vozmozhnosti"} aria-label="Листать дальше">
              ↓
            </a>
          </div>
        </div>
      </div>
      {scenes.map((scene) => (
        <div key={scene.id} id={scene.id} className="story-scroll-stop" aria-hidden="true" />
      ))}
    </div>
  );
}
