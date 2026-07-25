import { Redirect } from "wouter";

/** Tools folded into Hall manage — keep deep links alive. */
export default function HallToolsPage() {
  return <Redirect to="/hall#hall-tools" />;
}
