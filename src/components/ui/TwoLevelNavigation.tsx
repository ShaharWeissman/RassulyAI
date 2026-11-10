import { useEffect, useId, useRef, useState } from "react";
import {
  navigationFor,
  type NavigationItem,
  type PageDestination,
  type ProjectDestination,
} from "../../data/navigation";
import { Icon } from "./index";
import "../../styles/navigation.css";

export default function TwoLevelNavigation({
  admin,
  page,
  module,
  onNavigate,
  onProjectNavigate,
}: {
  admin: boolean;
  page: string;
  module: string;
  onNavigate: (page: PageDestination) => void;
  onProjectNavigate: (module: ProjectDestination) => void;
}) {
  const id = useId();
  const [expandedId, setExpandedId] = useState<string>();
  const nav = useRef<HTMLElement>(null);
  const secondary = useRef<HTMLDivElement>(null);
  const allTrigger = useRef<HTMLButtonElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const hoverOpened = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const groups = navigationFor(admin);
  const expanded = groups.find((group) => group.id === expandedId);
  const allOpen = expandedId === "all";
  const activeId =
    page === "project"
      ? "projects"
      : groups.find((group) =>
          group.items.some(
            (item) =>
              item.target && "page" in item.target && item.target.page === page,
          ),
        )?.id;

  function cancelClose() {
    clearTimeout(timer.current);
  }
  function open(groupId: string) {
    cancelClose();
    setExpandedId(groupId);
  }
  function close() {
    cancelClose();
    hoverOpened.current = undefined;
    setExpandedId(undefined);
  }
  function scheduleClose() {
    cancelClose();
    timer.current = setTimeout(() => {
      if (!secondary.current?.contains(document.activeElement)) {
        hoverOpened.current = undefined;
        setExpandedId(undefined);
      }
    }, 180);
  }
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !nav.current?.contains(event.target)
      ) {
        clearTimeout(timer.current);
        hoverOpened.current = undefined;
        setExpandedId(undefined);
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      clearTimeout(timer.current);
    };
  }, []);

  const available = (item: NavigationItem) =>
    item.target && ("page" in item.target || page === "project");

  function renderItem(item: NavigationItem) {
    const target = item.target;
    const unavailable = !available(item);
    const current =
      target &&
      ("page" in target
        ? target.page === page
        : page === "project" && target.module === module);
    return (
      <button
        key={item.id}
        type="button"
        disabled={unavailable}
        className={current ? "active" : undefined}
        aria-current={current ? "page" : undefined}
        onClick={() => {
          if (!target || unavailable) return;
          close();
          if ("page" in target) onNavigate(target.page);
          else onProjectNavigate(target.module);
        }}
      >
        <Icon name={item.icon} size={16} />
        <span>{item.label}</span>
        {unavailable && <small>{target ? "בפרויקט פתוח" : "טרם זמין"}</small>}
      </button>
    );
  }

  return (
    <nav
      ref={nav}
      className="header-navigation two-level-navigation"
      aria-label="ניווט ראשי"
      onPointerEnter={cancelClose}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !allOpen) scheduleClose();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || (!expanded && !allOpen)) return;
        event.preventDefault();
        (allOpen
          ? allTrigger.current
          : buttons.current.get(expanded!.id)
        )?.focus();
        close();
      }}
    >
      <div className="primary-navigation">
        {groups.map((group, index) => (
          <button
            key={group.id}
            type="button"
            id={`${id}-${group.id}`}
            ref={(element) => {
              if (element) buttons.current.set(group.id, element);
              else buttons.current.delete(group.id);
            }}
            className={`primary-navigation-trigger${activeId === group.id ? " active" : ""}`}
            aria-expanded={expandedId === group.id}
            aria-controls={
              expandedId === group.id ? `${id}-secondary` : undefined
            }
            onPointerEnter={(event) => {
              if (
                event.pointerType === "mouse" &&
                !allOpen &&
                expandedId !== group.id
              ) {
                hoverOpened.current = group.id;
                open(group.id);
              }
            }}
            onClick={(event) => {
              if (
                expandedId === group.id &&
                (event.detail === 0 || hoverOpened.current !== group.id)
              ) {
                close();
              } else {
                hoverOpened.current = undefined;
                open(group.id);
              }
            }}
            onKeyDown={(event) => {
              const firstItem =
                secondary.current?.querySelector<HTMLButtonElement>(
                  "button:not(:disabled)",
                );
              if (
                event.key === "Tab" &&
                !event.shiftKey &&
                expandedId === group.id &&
                firstItem
              ) {
                event.preventDefault();
                firstItem.focus();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                open(group.id);
                requestAnimationFrame(() =>
                  secondary.current
                    ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
                    ?.focus(),
                );
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                const delta = event.key === "ArrowLeft" ? 1 : -1;
                const next =
                  groups[(index + delta + groups.length) % groups.length];
                buttons.current.get(next.id)?.focus();
                if (expandedId) open(next.id);
              }
            }}
          >
            <Icon name={group.icon} size={16} />
            {group.label}
          </button>
        ))}
      </div>
      <button
        ref={allTrigger}
        id={`${id}-all`}
        type="button"
        className="primary-navigation-trigger all-navigation-trigger"
        aria-expanded={allOpen}
        aria-controls={allOpen ? `${id}-secondary` : undefined}
        onClick={() => (allOpen ? close() : open("all"))}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          open("all");
          requestAnimationFrame(() =>
            secondary.current
              ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
              ?.focus(),
          );
        }}
      >
        <Icon name="grid" size={16} />
        <span className="all-navigation-label">כל המסכים</span>
        <Icon name="chevron-down" size={12} />
      </button>
      {allOpen && (
        <div
          id={`${id}-secondary`}
          ref={secondary}
          className="secondary-navigation navigation-directory"
          role="group"
          aria-labelledby={`${id}-all`}
        >
          {groups.map((group) => (
            <section className="navigation-directory-group" key={group.id}>
              <h2>
                <Icon name={group.icon} size={17} /> {group.label}
              </h2>
              {group.items.map(renderItem)}
            </section>
          ))}
        </div>
      )}
      {expanded && (
        <div
          id={`${id}-secondary`}
          ref={secondary}
          className="secondary-navigation"
          role="group"
          aria-labelledby={`${id}-${expanded.id}`}
        >
          {expanded.items
            .filter((item) => !item.projectOnly || page === "project")
            .map(renderItem)}
        </div>
      )}
    </nav>
  );
}
