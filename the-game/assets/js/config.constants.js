export const HAND_SIZE = 8;
export const MIN_PLAYS_PER_TURN_WITH_DECK = 2;
export const MIN_PLAYS_PER_TURN_NO_DECK = 1;

export const BRAVO_VIDEO_URL = "https://youtu.be/I2YhWaUDtXg?si=ijeNEmaf2hXkSL2j";

export function requiredPlaysThisTurn(state){
  return (state?.deck?.length > 0) ? MIN_PLAYS_PER_TURN_WITH_DECK : MIN_PLAYS_PER_TURN_NO_DECK;
}
