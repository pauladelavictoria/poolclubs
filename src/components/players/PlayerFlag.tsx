import { useContext } from "react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { CountryContext } from "./playerContexts";

/** The flag for a player id, from the nearest PlayerCountries — for a name
 *  that is not a PlayerLink. Nothing outside a provider. */
export function PlayerFlag({ playerId }: { playerId: number }) {
  return <CountryFlag country={useContext(CountryContext)?.get(playerId)} />;
}
