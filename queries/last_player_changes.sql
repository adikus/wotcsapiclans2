SELECT DISTINCT ON (player_id) player_id, clan_id, changed_at, joined, id
FROM changes
WHERE player_id IN (SELECT DISTINCT player_id FROM changes WHERE clan_id = <%= clan_id %>)
ORDER BY player_id, changed_at DESC