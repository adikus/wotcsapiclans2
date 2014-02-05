SELECT changes.*, clans.name clan_name, clans.tag clan_tag FROM changes
  LEFT JOIN clans ON clans.id = changes.clan_id
WHERE changes.player_id = <%= player_id %> ORDER BY changed_at DESC