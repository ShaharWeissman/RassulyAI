import { useEffect, useId, useRef, useState } from "react";
import {
  navigationFor,
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
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const hoverOpened = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const groups = navigationFor(admin);
  const expanded = groups.find((group) => group.id === expandedId);
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

  return (
    <nav
      ref={nav}
      className="header-navigation two-level-navigation"
      aria-label="ניווט ראשי"
      onPointerEnter={cancelClose}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") scheduleClose();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !expanded) return;
        event.preventDefault();
        buttons.current.get(expanded.id)?.focus();
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
              if (event.pointerType === "mouse" && expandedId !== group.id) {
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
            <Icon name="chevron-down" size={12} />
          </button>
        ))}
      </div>
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
            .map((item) => {
              const target = item.target;
              const projectTarget = target && "module" in target;
              const unavailable =
                !target || (projectTarget && page !== "project");
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
                  {unavailable && (
                    <small>{projectTarget ? "בפרויקט פתוח" : "טרם זמין"}</small>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </nav>
  );
}
