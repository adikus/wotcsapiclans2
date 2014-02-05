WITH prev_changes AS
(SELECT changes.clan_id,
changes.player_id,
changes.changed_at,
changes.joined,
ROW_NUMBER() OVER(PARTITION BY changes.player_id
ORDER BY changes.changed_at DESC) AS rank
FROM changes
WHERE clan_id != <%= clan_id %> AND joined = false AND ( <%= where %> )
)
SELECT prev_changes.*, clans.name clan_name, clans.tag clan_tag
FROM prev_changes
LEFT JOIN clans ON clans.id = prev_changes.clan_id
WHERE rank = 1
ORDER BY changed_at DESC