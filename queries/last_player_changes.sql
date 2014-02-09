WITH prev_changes AS
(SELECT changes.clan_id,
   changes.player_id,
   changes.changed_at,
   changes.joined,
   changes.id,
   ROW_NUMBER() OVER(PARTITION BY changes.player_id
     ORDER BY changes.changed_at DESC) AS rank
 FROM changes
 WHERE player_id IN (SELECT player_id FROM changes WHERE clan_id = <%= clan_id %> GROUP BY player_id)
)
SELECT *
FROM prev_changes
WHERE rank = 1