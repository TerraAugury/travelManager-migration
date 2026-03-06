export function sharedTripAccessWhere({ tripAlias = "t", userParam = "$1" } = {}) {
  return `(${tripAlias}.owner_user_id = ${userParam} OR ${tripAlias}.id IN (
    SELECT ts.trip_id
    FROM trip_shares ts
    WHERE ts.shared_with_user_id = ${userParam} AND ts.trip_id IS NOT NULL
    UNION
    SELECT tr.id
    FROM trips tr
    JOIN trip_shares ts2 ON ts2.owner_user_id = tr.owner_user_id
    WHERE ts2.shared_with_user_id = ${userParam} AND ts2.trip_id IS NULL
  ))`;
}
