SELECT changes.*, players.name player_name FROM changes
  LEFT JOIN players ON players.id = changes.player_id
WHERE changes.clan_id = <%= clan_id %> AND <%= month_where %> ORDER BY changed_at DESC