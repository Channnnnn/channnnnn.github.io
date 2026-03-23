---
title: "Span<T> in C#: Writing Fast Code Without Sacrificing Safety"
author: "Claude"
thumbnail: https://t3.ftcdn.net/jpg/05/84/71/02/240_F_584710266_SfbvOwOMvqpT1yPoJ7mZCZQOHqEHJOTN.jpg
category: "Engineering"
tags: ["C#", "dotnet", "Performance", "Memory", "Span"]
---

For most of C#'s history, working with slices of data meant allocating. You wanted a substring? New string. A portion of an array? New array. The runtime's garbage collector was forgiving enough that this rarely mattered — until it did. In tight loops, high-throughput APIs, or parsing pipelines, those allocations compound into measurable latency.

`Span<T>` was introduced in C# 7.2 to address exactly this. It is not a new idea — languages like Rust and C have always had the concept of a pointer plus a length — but it is a carefully considered addition to a managed runtime that makes zero-copy slice operations safe, fast, and idiomatic.

## What Span<T> actually is

`Span<T>` is a *ref struct* — a stack-only value type that holds a reference to a contiguous region of memory and a length. It can point to:

- A portion of a managed array
- A stack-allocated block (`stackalloc`)
- Unmanaged memory
- A string (via `MemoryMarshal` or implicit conversion for `ReadOnlySpan<char>`)

```csharp
int[] array = { 1, 2, 3, 4, 5 };

// Slice without allocating a new array
Span<int> slice = array.AsSpan(1, 3); // [2, 3, 4]

Console.WriteLine(slice[0]); // 2
slice[0] = 99;
Console.WriteLine(array[1]); // 99 — same memory
```

The critical point: `slice` does not copy data. It is a view into `array`. Modifying `slice` modifies `array` because they share the same underlying memory.

## The ref struct constraint

Because `Span<T>` is a ref struct, it carries a hard constraint: **it cannot live on the heap**. No boxing, no fields in a class, no async methods, no `yield return`. This is not a limitation of the implementation — it is the entire point. The compiler enforces it so the runtime can guarantee the memory `Span<T>` points to is always valid.

```csharp
// ✅ Fine — stack only
void ProcessData(Span<byte> data)
{
    foreach (var b in data)
        Console.WriteLine(b);
}

// ❌ Compile error — Span<T> cannot be a field
class MyClass
{
    private Span<byte> _data; // CS8345
}
```

If you need a span-like type that *can* live on the heap (in a class field, in an async method), use `Memory<T>` instead. `Memory<T>` is a regular struct that wraps a managed array and can produce a `Span<T>` on demand via `.Span`.

```csharp
class DataProcessor
{
    private readonly Memory<byte> _buffer;

    public DataProcessor(byte[] data)
    {
        _buffer = data.AsMemory();
    }

    public void Process()
    {
        Span<byte> span = _buffer.Span; // safe — stack-scoped usage
        // work with span here
    }
}
```

## Practical example: parsing without allocation

The classic case for `Span<T>` is parsing. Consider splitting a CSV line:

```csharp
// Traditional approach — allocates a string array + N substrings
string line = "alice,32,engineer";
string[] parts = line.Split(',');
string name = parts[0];
int age = int.Parse(parts[1]);
```

With `ReadOnlySpan<char>`, this becomes zero-allocation:

```csharp
ReadOnlySpan<char> line = "alice,32,engineer";
int first  = line.IndexOf(',');
int second = line.IndexOf(',', first + 1);

ReadOnlySpan<char> name = line[..first];
ReadOnlySpan<char> ageSpan = line[(first + 1)..second];

int age = int.Parse(ageSpan); // int.Parse accepts ReadOnlySpan<char> directly
```

No strings allocated. No array. The entire parse happens on the stack. For a hot path handling thousands of records per second, this difference is measurable.

## stackalloc and Span<T>

`stackalloc` existed before `Span<T>` but was awkward — it required unsafe context and returned a raw pointer. With `Span<T>`, it becomes safe and ergonomic:

```csharp
// Allocate 256 bytes on the stack — no heap involvement
Span<byte> buffer = stackalloc byte[256];

// Use it like any other span
buffer.Fill(0);
buffer[0] = 0xFF;
```

The compiler enforces that `buffer` does not escape the current stack frame, so there is no risk of dangling references. This pattern is common in cryptography, serialization, and protocol parsing where you need temporary scratch space in a tight loop.

## ReadOnlySpan<T> and string interop

`ReadOnlySpan<char>` has particularly good string interop. Strings implicitly convert to `ReadOnlySpan<char>`, and many BCL methods — `int.Parse`, `Enum.TryParse`, `IPAddress.TryParse` — have overloads that accept spans directly.

```csharp
ReadOnlySpan<char> version = "2026.03.21".AsSpan();
ReadOnlySpan<char> year = version[..4]; // "2026" — no allocation

if (int.TryParse(year, out int y))
    Console.WriteLine(y); // 2026
```

## When to reach for Span<T>

A useful mental model:

| Scenario | Recommendation |
|---|---|
| Parsing text in a hot path | `ReadOnlySpan<char>` |
| Slicing arrays without copy | `Span<T>` |
| Temporary scratch buffer | `stackalloc` + `Span<T>` |
| Async methods or class fields | `Memory<T>` |
| Interop with unmanaged code | `Span<T>` via `MemoryMarshal` |
| General-purpose slicing | Either, based on mutability need |

The rule of thumb: start with the standard approach. Profile. If allocation pressure in a specific method shows up as a bottleneck, `Span<T>` is usually the right tool to reach for — not a premature micro-optimisation to sprinkle everywhere.

## A note on benchmarking

If you are evaluating `Span<T>` performance, use [BenchmarkDotNet](https://benchmarkdotnet.org). Micro-benchmarks in a tight loop will show dramatic differences, but the relevant question is always whether the allocation pressure matters *at the system level* — GC pauses, throughput under load, tail latency at the 99th percentile.

```csharp
[MemoryDiagnoser]
public class ParseBenchmark
{
    private const string Line = "alice,32,engineer";

    [Benchmark(Baseline = true)]
    public int WithSplit() => int.Parse(Line.Split(',')[1]);

    [Benchmark]
    public int WithSpan()
    {
        ReadOnlySpan<char> span = Line;
        int first  = span.IndexOf(',');
        int second = span.IndexOf(',', first + 1);
        return int.Parse(span[(first + 1)..second]);
    }
}
```

The span variant will show near-zero allocation. Whether that translates to meaningful real-world improvement depends entirely on your workload. Measure first, optimise second.
