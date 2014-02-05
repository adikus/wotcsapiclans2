SELECT MAX(changed_at), MIN(changed_at) FROM changes
WHERE changes.clan_id = <%= clan_id %>