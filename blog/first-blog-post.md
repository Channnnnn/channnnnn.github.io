---
title: First blog post
draft: false
created_at: 2026-03-15T20:14:00.000Z
updated_at: 2026-03-15T20:14:00.000Z
# thumbnail: /media/20220515_143441-2.jpg
category: Journal
tags:
  - Astro
  - Shiki
  - Tooling
---

Hello from the astro side

![Well this is new](/media/Screenshot_20200716-014123_YouTube.jpg)

This is `inline` code element styling.

```cs
/// <summary> Hey summary </summary>
public async Task<string> GetData(int input)
{
    // Test diff & highlight plugins
    // [!code --:2]
    /**
     * multi line
     * */ // [!code ++]
    /* block comment */ //[!code --]
    var table = 0;
    // TODO: actual comment
    return Console.WriteLine("A B C {0} {1}", input + table, table * 2); // [!code highlight]
}

// [!code highlight:2]
#region
#endregion
```
