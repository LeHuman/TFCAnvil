"""TFC Calculator for Anvil"""
import itertools
import pulp

ACTIONS = {
    "Light Hit": -3,
    "Medium Hit": -6,
    "Hard Hit": -9,
    "Draw": -15,
    "Punch": 2,
    "Bend": 7,
    "Upset": 13,
    "Shrink": 16,
}

ITEMS = [
    ("Mining Hammer Head", 55, ["Punch", "Shrink"]),
    ("Axe Head",  100, ["Punch", "Hit", "Upset"]),
    ("Spade Head",  75, ["Punch", "Hit"]),
    ("Knife Head",  71, ["Punch", "Bend", "Draw"]),
]


def optimize(actions: dict[str, int], target: int, last: list[str]) -> tuple[dict[str, int], list[str]]:
    problem = pulp.LpProblem("linear_optimization", pulp.LpMinimize)
    variables: list[pulp.LpVariable] = []
    multiple = None

    for name, val in actions.items():
        var = pulp.LpVariable(name, lowBound=0, cat="Integer")
        _var = var*abs(val)
        if val < 0:
            multiple = (multiple - _var) if multiple else -_var
        else:
            multiple = (multiple + _var) if multiple else _var
        variables.append(var)

    for name in last:
        multiple += actions[name]

    problem += sum(variables)
    problem += multiple == target
    problem.solve(pulp.apis.coin_api.PULP_CBC_CMD(msg=0))
    results: dict[str, int] = {}

    for var in variables:
        results[var.name] = round(pulp.value(var))

    return ({k: v for k, v in results.items() if v > 0}, last)


def preprocess(actions: dict[str, int], target: int, last: list[str]) -> tuple[dict[str, int], dict[str, int], list[str]]:
    actions = {k.lower(): v for k, v in actions.items()}
    last = [v.lower() for v in last]

    if "hit" in last:
        hits = [k for k in actions.keys() if "hit" in k]
        combos = list(itertools.combinations_with_replacement(hits, last.count("hit")))
        no_hit_last = [v for v in last if v != "hit"]
        results: list[tuple[dict, list[str]]] = []
        result_sz = []

        for combo in combos:
            result = optimize(actions, target, no_hit_last + list(combo))
            result_sz.append(len(result[0]))
            results.append(result)

        result, rlast = results[result_sz.index(min(result_sz))]
        final_last = []

        for name in last:
            if name == "hit":
                while len(rlast) != 0:
                    val = rlast.pop(0)
                    if "hit" in val:
                        name = val
                        break
                else:
                    return (actions, dict(), ["Failed"])
            final_last.append(name)

        return (actions, result, final_last)
    else:
        return (actions, *optimize(actions, target, last))


def postprocess(actions: dict[str, int], target: int, last: list[str]) -> tuple[list[tuple[str, int]], list[str]]:
    actions, result, last = preprocess(actions, target, last)
    actions = {k: v for k, v in actions.items() if k in result}
    final: list[tuple[str, int]] = []

    while len(result) != 0:
        name = max(actions, key=actions.get)
        del actions[name]
        final.append((name, result.pop(name)))

    return final, last


def print_items(items: list[tuple[str, int, list[str]]], actions: dict[str, int]):
    for item in items:
        name = item[0]
        result, last = postprocess(actions, item[1], item[2])
        fnl = [f"{k} x{v}" for k, v in result]
        for v in last:
            fnl.append(f"{v} x1")
        print(f"{name} @ {item[1]} | " + ", ".join(fnl))


print_items(ITEMS, ACTIONS)
