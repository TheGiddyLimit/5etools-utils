# Schema Templates

This directory contains extended pseudo JSON-schema files, designed to be compiled down to usable JSON schema files using `node ./node/compile-schemas.js [homebrew]`.

## Preprocessor Properties

### `$$ifSite`/`$$ifBrew`/`$$ifUa`

The value will be merged into its parent iff the compilation mode matches the key, for example:

---

```json
{
	"$$ifBrew": {
		"b": 1
	}
}
```

Outputs the following when compiled in "site" mode:

```json
{}
```

---

```json
{
	"$$ifSite": {
		"a": 1
	},
	"$$ifBrew": {
		"a": 2
	}
}
```

Outputs the following when compiled in "site" mode:

```json
{
	"a": 1
}
```

Outputs the following when compiled in "homebrew" mode:

```json
{
	"a": 2
}
```

---

### `$$ifSite_item`/`$$ifBrew_item`/`$$ifUa_item`

Usable only in an array. The value will be included in the array iff the compilation mode matches the key, for example:

---

```json
{
	"myArray": [
		{"$$ifBrew_item": 1},
		2,
		3
	]
}
```

Outputs the following when compiled in "site" mode:

```json
{
	"myArray": [
		2,
		3
	]
}
```

Outputs the following when compiled in "homebrew" mode:

```json
{
	"myArray": [
		1,
		2,
		3
	]
}
```

---

### `$$switch_key`

The key/value will be merged into its parent with a key decided by the compilation mode, for example:

---

```json
{
	"$$switch_key": {
		"key_site": "enum",
		"key_ua": "enum",
		"key_brew": "examples",
		"value": [1]
	}
}
```

Outputs the following when compiled in "site" mode:

```json
{
	"enum": [1]
}
```

Outputs the following when compiled in "homebrew" mode:

```json
{
	"examples": [1]
}
```

---


### `$$if`

The `value` will be merged into its parent iff the compilation mode matches one of the values in the `modes` array, for example:

---

```json
{
	"$$if": {
		"modes": ["site", "ua"],
		"value": {
			"a": 1
		}
	}
}
```

Outputs the following when compiled in "site" mode or "ua" mode:

```json
{
  "a": 1
}
```

and the following when compiled in "brew" mode:

```json
{}
```


---


### `$$if_item`


Usable only in an array. The value will be included in the array iff the compilation mode matches a mode in `modes`, for example:

---

```json
{
	"myArray": [
		{
			"$$if_item": {
				"modes": ["site", "ua"],
				"value": 1
			}
		},
		2,
		3
	]
}
```

Outputs the following when compiled in "site" or "ua" mode:

```json
{
	"myArray": [
		1,
		2,
		3
	]
}
```

Outputs the following when compiled in "homebrew" mode:

```json
{
	"myArray": [
		2,
		3
	]
}
```
