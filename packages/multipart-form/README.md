# @proventuslabs/nestjs-multipart-form

A lightweight and efficient NestJS package for handling multipart form data and file uploads with RxJS streaming support and type safety.

## 🚀 Features

- 🔄 **Express Integration**: Built for Express.js applications
- 📁 **RxJS Streaming**: Handle files and fields efficiently with RxJS Observables and Node.js streams
- 🎯 **Type-Safe Decorators**: Built-in decorators with validation and pattern matching support
- 🔧 **Flexible Configuration**: Customizable Busboy configuration options
- 🛡️ **Validation Support**: Required/optional fields with pattern matching (e.g., `^user_` for fields starting with "user_")
- ⚡ **High Performance**: Lightweight implementation with minimal overhead
- 🚨 **Comprehensive Error Handling**: Custom exception filter with proper HTTP status codes

## 🔄 Key Difference: Streaming vs Traditional Parsing

Unlike traditional multipart form handling where the entire request is parsed **before** your controller handler is called, this package processes the multipart data **concurrently** with your controller execution using RxJS streams.

### Traditional Approach
```
Request → Parse Entire Multipart Data → Controller Handler Called → Process Files
```

### RxJS Streaming Approach
```
Request → Start Parsing → Controller Handler Called → Process Files as Streams
                ↓
            Files arrive as they're parsed
```

## 📦 Installation

```bash
npm install @proventuslabs/nestjs-multipart-form
```

## 🎯 Quick Start

### 1. Basic Setup

```typescript
import { Controller, Post, UseInterceptors, UseFilters } from '@nestjs/common';
import { 
  MultipartFiles, 
  MultipartFields,
  MultipartInterceptor,
  MultipartExceptionFilter,
  type MultipartFileStream,
  type MultipartField
} from '@proventuslabs/nestjs-multipart-form';
import { Observable } from 'rxjs';
import { map, toArray, mergeMap } from 'rxjs/operators';
import { from, merge } from 'rxjs';
import { buffer } from 'node:stream/consumers';

@Controller('upload')
@UseFilters(MultipartExceptionFilter)
export class UploadController {
  @Post('avatar')
  @UseInterceptors(MultipartInterceptor())
  async uploadAvatar(
    @MultipartFiles(['file']) files$: Observable<MultipartFileStream>,
    @MultipartFields(['name']) fields$: Observable<MultipartField>
  ) {
    const fileProcessing$ = files$.pipe(
      mergeMap(file => 
        from(buffer(file)).pipe(
          map(data => ({ 
            fieldname: file.fieldname, 
            filename: file.filename,
            size: data.length 
          }))
        )
      )
    );
    
    const fieldProcessing$ = fields$.pipe(
      map(field => ({ name: field.name, value: field.value }))
    );

    return merge(fileProcessing$, fieldProcessing$).pipe(toArray());
  }
}
```

### 2. Pattern Matching for Fields

```typescript
@Post('profile')
@UseInterceptors(MultipartInterceptor())
async uploadProfile(
  @MultipartFields(['name', '^user_', ['metadata', false]]) fields$: Observable<MultipartField>
) {
  // Matches:
  // - 'name' exactly (required)
  // - any field starting with 'user_' (required) 
  // - 'metadata' exactly (optional)
  return fields$.pipe(toArray());
}
```

### 3. Optional/Required File Validation

```typescript
@Post('document')
@UseInterceptors(MultipartInterceptor())
async uploadDocument(
  @MultipartFiles([['document'], ['thumbnail', false]]) files$: Observable<MultipartFileStream>
) {
  // 'document' is required, 'thumbnail' is optional
  return files$.pipe(toArray());
}
```

## 🔧 API Reference

### MultipartInterceptor

```typescript
@UseInterceptors(MultipartInterceptor(options?: MultipartOptions))
```

**Options:**
- `limits` - File size and field limits (from Busboy)
- `preservePath` - Whether to preserve file paths 
- `bubbleErrors` - Bubble errors after controller ends (default: false)
- `autodrain` - Auto-drain unread files (default: true)

### MultipartFiles Decorator

```typescript
@MultipartFiles() // All files
@MultipartFiles('fieldname') // Single required field
@MultipartFiles(['field1', 'field2']) // Multiple required fields
@MultipartFiles([['field1'], ['field2', false]]) // Mixed required/optional
```

Returns: `Observable<MultipartFileStream>`

### MultipartFields Decorator

```typescript
@MultipartFields() // All fields
@MultipartFields('name') // Single required field
@MultipartFields(['name', '^user_']) // Pattern matching support
@MultipartFields([['name'], ['meta', false]]) // Mixed required/optional
```

Returns: `Observable<MultipartField>`

**Pattern Matching:**
- `"fieldname"` - Exact match
- `"^prefix_"` - Fields starting with "prefix_"

## 🔄 RxJS Operators

The package provides specialized RxJS operators to transform multipart field data:

### associateFields()

Parses field names with associative syntax (e.g., `user[name]`, `data[items][0]`) and enriches the field objects with parsed information.

```typescript
import { associateFields } from '@proventuslabs/nestjs-multipart-form';

@Post('form')
@UseInterceptors(MultipartInterceptor())
async handleForm(
  @MultipartFields() fields$: Observable<MultipartField>
) {
  return fields$.pipe(
    associateFields(),
    map(field => {
      if (field.isAssociative) {
        // For field name "user[name]=John":
        console.log(field.name);          // "user[name]"
        console.log(field.value);         // "John"  
        console.log(field.basename);      // "user"
        console.log(field.associations);  // ["name"]
        console.log(field.isAssociative); // true
      }
      return field;
    }),
    toArray()
  );
}
```

**Supported Syntax:**
- `field[key]` → basename: `field`, associations: `["key"]`
- `field[key1][key2]` → basename: `field`, associations: `["key1", "key2"]`
- `field[0][name]` → basename: `field`, associations: `["0", "name"]`
- `[]` → basename: `<empty>`, associations: `[""]`

### collectAssociatives()

Collects associative multipart fields into structured objects and arrays using the `qs` library. Fields with array-like syntax (`field[]`) are collected into arrays, while fields with object-like syntax (`field[name]`) are collected into objects.

```typescript
import { collectAssociatives } from '@proventuslabs/nestjs-multipart-form';

@Post('structured')
@UseInterceptors(MultipartInterceptor())
async handleStructuredForm(
  @MultipartFields() fields$: Observable<MultipartField>
) {
  return fields$.pipe(
    associateFields(),
    collectAssociatives(),
    map(parsed => {
      // For fields "name[first]=John" and "name[last]=Doe":
      console.log(parsed); // { "name": { "first": "John", "last": "Doe" } }
      
      // For fields "tags[]=urgent" and "tags[]=important":
      console.log(parsed); // { "tags": ["urgent", "important"] }
      
      return parsed;
    })
  );
}
```

The operator accepts optional `qs.IParseOptions` for customizing parsing behavior.

## 🚨 Error Handling

Built-in error types:
- **MissingFilesError** - Required files missing
- **MissingFieldsError** - Required fields missing  
- **FilesLimitError**, **FieldsLimitError**, **PartsLimitError** - Limits exceeded
- **TruncatedFileError**, **TruncatedFieldError** - Data truncated
- **MultipartError** - Base class for all multipart-related errors

```typescript
import { MultipartExceptionFilter } from '@proventuslabs/nestjs-multipart-form';

@UseFilters(MultipartExceptionFilter)
export class UploadController {}
```

## 📝 Module Setup

```typescript
import { Module } from '@nestjs/common';
import { MultipartModule } from '@proventuslabs/nestjs-multipart-form';

@Module({
  imports: [
    MultipartModule.register({
      limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5
      }
    })
  ]
})
export class AppModule {}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](../../CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🔗 Links

- [ProventusLabs](https://proventuslabs.com)
- [NestJS Documentation](https://nestjs.com)
- [RxJS Documentation](https://rxjs.dev)
- [Busboy Documentation](https://github.com/mscdex/busboy)
