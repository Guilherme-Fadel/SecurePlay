// Todos os caminhos de saldo/regeneração usam este script, inclusive leituras.
export const TOKEN_STATE_SCRIPT = `
  local mode = ARGV[5]
  local now = tonumber(ARGV[3])
  if mode == 'run' then
    local receipt = redis.call('GET', KEYS[2])
    if receipt then
      local value = cjson.decode(receipt)
      return {1, value.balance, value.lastRegenAt, value.at}
    end
  end
  local cap = tonumber(ARGV[1])
  local regen = tonumber(ARGV[2])
  local balance = cap
  local last = now
  local raw = redis.call('GET', KEYS[1])
  if raw then
    local valid, value = pcall(cjson.decode, raw)
    if valid and type(value) == 'table' then
      if type(value.balance) == 'number' then balance = math.max(0, math.min(cap, math.floor(value.balance))) end
      if type(value.lastRegenAt) == 'number' and value.lastRegenAt >= 0 then last = math.min(now, value.lastRegenAt) end
    end
  end
  if balance >= cap then
    balance = cap
    last = now
  elseif now - last >= regen then
    local count = math.min(math.floor((now - last) / regen), cap - balance)
    balance = balance + count
    last = balance >= cap and now or last + count * regen
  end
  local ok = 1
  if mode == 'run' and now > tonumber(ARGV[6]) then
    return {-1, balance, last, now}
  elseif mode == 'refill' then
    balance = cap
    last = now
  elseif mode == 'consume' or mode == 'run' then
    if balance > 0 then balance = balance - 1 else ok = 0 end
  end
  redis.call('SET', KEYS[1], cjson.encode({balance = balance, lastRegenAt = last}), 'EX', ARGV[4])
  if mode == 'run' and ok == 1 then
    redis.call('SET', KEYS[2], cjson.encode({balance = balance, lastRegenAt = last, at = now}), 'EX', ARGV[4])
  end
  return {ok, balance, last, now}
`;
