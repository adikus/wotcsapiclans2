WITH prev_changes AS
(SELECT changes.clan_id,
	  changes.player_id,
	  changes.changed_at,
          ROW_NUMBER() OVER(PARTITION BY changes.player_id
                                ORDER BY changes.changed_at DESC) AS rank
    FROM changes
    WHERE player_id IN (<%= player_ids.join(', ') %>) AND joined = true
)
SELECT *
  FROM prev_changes
 WHERE rank = 1 AND clan_id = <%= clan_id %>