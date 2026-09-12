"use client";
import { forwardRef, useImperativeHandle, useRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { PhonePhotoUpload } from '@/components/PhonePhotoUpload';

export const PhotoFileInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PhotoFileInput(props, ref) {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current!, []);
  return <><input {...props} ref={input} /><PhonePhotoUpload multiple={props.multiple} disabled={props.disabled} onFiles={files => {
    if (!input.current || props.disabled) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.current.files = transfer.files;
    props.onChange?.({ target: input.current, currentTarget: input.current } as ChangeEvent<HTMLInputElement>);
  }} /></>;
});
