; ModuleID = 'probe3.c1c148e8-cgu.0'
source_filename = "probe3.c1c148e8-cgu.0"
target datalayout = "e-m:e-p:64:64-i64:64-n32:64-S128"
target triple = "bpfel"

; probe3::probe
; Function Attrs: nounwind
define void @_ZN6probe35probe17h3c39ed271b4cef9bE() unnamed_addr #0 {
start:
  %0 = alloca i32, align 4
  store i32 1, i32* %0, align 4
  %1 = load i32, i32* %0, align 4
  br label %bb1

bb1:                                              ; preds = %start
  ret void
}

; Function Attrs: nofree nosync nounwind readnone speculatable willreturn
declare i32 @llvm.cttz.i32(i32, i1 immarg) #1

attributes #0 = { nounwind "target-cpu"="generic" }
attributes #1 = { nofree nosync nounwind readnone speculatable willreturn }

!llvm.module.flags = !{!0}

!0 = !{i32 7, !"PIC Level", i32 2}
