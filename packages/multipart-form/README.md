# @proventuslabs/nestjs-multipart-form

A lightweight and efficient NestJS package for handling multipart form data and file uploads with streaming support and type safety.

## 🚀 Features

- 📁 **Streaming File Uploads**: Handle large files efficiently with Node.js streams
- 🎯 **Type-Safe Decorators**: Built-in decorators for single and multiple file uploads
- 🔧 **Flexible Configuration**: Customizable Busboy configuration options
- 🛡️ **Validation Support**: Built-in validation for required files and fields
- ⚡ **High Performance**: Lightweight implementation with minimal overhead (busboy)
- 🔄 **Express Integration**: Seamless integration with Express.js applications

## 📦 Installation

```bash
npm install @proventuslabs/nestjs-multipart-form
```

## 🎯 Quick Start

### 1. Basic File Upload

```typescript
import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { 
  MultipartFile, 
  MultipartInterceptor,
  type MultipartFileUpload 
} from '@proventuslabs/nestjs-multipart-form';

@Controller('upload')
export class UploadController {
  @Post('file')
  @UseInterceptors(MultipartInterceptor())
  async uploadFile(@MultipartFile('file') file: MultipartFileUpload) {
    // Handle the uploaded file
    console.log('Filename:', file.filename);
    console.log('MIME type:', file.mimetype);
    
    // Process the file stream
    const data = await this.processFile(file);
    
    return { message: 'File uploaded successfully', data };
  }
}
```

### 2. Multiple File Upload

```typescript
import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { 
  MultipartFiles, 
  MultipartInterceptor,
  type MultipartFileUpload 
} from '@proventuslabs/nestjs-multipart-form';

@Controller('upload')
export class UploadController {
  @Post('files')
  @UseInterceptors(MultipartInterceptor())
  async uploadFiles(@MultipartFiles(['image', 'document']) files: MultipartFileUpload[]) {
    // Handle multiple files
    const results = await Promise.all(
      files.map(file => this.processFile(file))
    );
    
    return { 
      message: 'Files uploaded successfully', 
      count: files.length,
      results 
    };
  }
}
```

### 3. Optional File Upload

```typescript
import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { 
  MultipartFile, 
  MultipartInterceptor,
  type MultipartFileUpload 
} from '@proventuslabs/nestjs-multipart-form';

@Controller('upload')
export class UploadController {
  @Post('optional')
  @UseInterceptors(MultipartInterceptor())
  async uploadOptional(
    @MultipartFile({ fieldname: 'avatar', required: false }) 
    avatar?: MultipartFileUpload
  ) {
    if (avatar) {
      // Process the avatar file
      await this.processAvatar(avatar);
    }
    
    return { message: 'Upload completed' };
  }
}
```

## 🔧 API Reference

### MultipartInterceptor

The main interceptor that processes multipart form data.

```typescript
@UseInterceptors(MultipartInterceptor(config?: BusboyConfig))
```

**Configuration Options:**
- `limits` - File size and field limits
- `preservePath` - Whether to preserve file paths
- `fileHwm` - File stream high water mark
- `defCharset` - Default character set

### MultipartFile Decorator

Extract a single file from the request.

```typescript
@MultipartFile(fieldname: string)
@MultipartFile({ fieldname: string, required?: boolean })
```

**Parameters:**
- `fieldname` - The form field name containing the file
- `required` - Whether the file is required (default: true)

### MultipartFiles Decorator

Extract multiple files from the request.

```typescript
@MultipartFiles() // All files
@MultipartFiles(fieldname: string) // Files with specific fieldname
@MultipartFiles(fieldnames: string[]) // Files with specific fieldnames
@MultipartFiles({ fieldnames?: string[], required?: boolean })
```

**Parameters:**
- `fieldnames` - Array of field names to filter files
- `required` - Whether files are required (default: true)

### MultipartFileUpload

The file upload Readble stream with the following properties:

```typescript
interface MultipartFileUpload extends Readable {
  fieldname: string;    // Form field name
  filename: string;     // Original filename
  encoding: string;     // File encoding
  mimetype: string;     // MIME type
}
```

## 📝 Examples

### Complete Example with File Processing

```typescript
import { buffer } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';
import { Controller, Logger, Post, UseInterceptors } from '@nestjs/common';
import { 
  MultipartFile, 
  MultipartInterceptor,
  type MultipartFileUpload 
} from '@proventuslabs/nestjs-multipart-form';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  @Post('avatar')
  @UseInterceptors(MultipartInterceptor())
  async uploadAvatar(@MultipartFile('file') file: MultipartFileUpload) {
    this.logger.debug(`Uploading file: ${file.filename}`);
    
    // Get file buffer
    const data = await pipeline(file, buffer);
    
    // Process the file data
    const result = await this.processImage(data);
    
    return {
      message: 'Avatar uploaded successfully',
      filename: file.filename,
      size: data.length,
      result
    };
  }

  private async processImage(buffer: Buffer) {
    // Your image processing logic here
    return { processed: true };
  }
}
```

### Global Interceptor Setup

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MultipartInterceptor } from '@proventuslabs/nestjs-multipart-form';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MultipartInterceptor({
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          files: 5
        }
      })
    }
  ]
})
export class AppModule {}
```

## 🔒 Validation

The package includes built-in validation:

- **Required Files**: Throws `BadRequestException` if required files are missing
- **Field Validation**: Validates specific field names exist
- **Type Safety**: Full TypeScript support with proper typing

## 🚀 Performance

- **Streaming**: Files are processed as streams, not loaded entirely into memory
- **Efficient**: Uses Busboy for fast multipart parsing
- **Lightweight**: Minimal overhead and dependencies

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](../../CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🔗 Links

- [ProventusLabs](https://proventuslabs.com)
- [NestJS Documentation](https://nestjs.com)
- [Busboy Documentation](https://github.com/mscdex/busboy)
