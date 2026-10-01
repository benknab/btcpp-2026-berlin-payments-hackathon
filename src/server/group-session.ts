import { getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";

function organizerCookie(groupId: string): string {
  return `group-organizer-${groupId}`;
}

function participantCookie(groupId: string): string {
  return `group-participant-${groupId}`;
}

function saveCookie(name: string, value: string): void {
  const SESSION_SECONDS = 2_592_000;
  setCookie(name, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: getRequestUrl().protocol === "https:",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function readOrganizerToken(groupId: string): string | undefined {
  return getCookie(organizerCookie(groupId));
}

export function saveOrganizerToken(groupId: string, token: string): void {
  saveCookie(organizerCookie(groupId), token);
}

export function readParticipantId(groupId: string): string | undefined {
  return getCookie(participantCookie(groupId));
}

export function saveParticipantId(groupId: string, participantId: string): void {
  saveCookie(participantCookie(groupId), participantId);
}
